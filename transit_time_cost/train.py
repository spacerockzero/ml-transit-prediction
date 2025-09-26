# lgb_transit_pipeline.py
import pandas as pd
import numpy as np
from sklearn.model_selection import TimeSeriesSplit
from sklearn.preprocessing import OneHotEncoder
from sklearn.metrics import mean_absolute_error, mean_squared_error
import lightgbm as lgb
from joblib import dump, load


# ---- Utility functions ----
def cyclical_encode(df, col, period):
    radians = 2 * np.pi * df[col] / period
    df[f"{col}_sin"] = np.sin(radians)
    df[f"{col}_cos"] = np.cos(radians)
    return df


def target_encode_smooth(train, valid, col, target, min_samples_leaf=100, smoothing=10):
    # mean encoding with simple smoothing using global mean
    prior = train[target].mean()
    agg = (
        train.groupby(col)[target]
        .agg(["count", "mean"])
        .rename(columns={"count": "n", "mean": "mean"})
    )
    agg["smoothing"] = 1 / (1 + np.exp(-(agg["n"] - min_samples_leaf) / smoothing))
    agg["enc"] = prior * (1 - agg["smoothing"]) + agg["mean"] * agg["smoothing"]
    mapping = agg["enc"].to_dict()
    encoded_values = valid[col].map(mapping).fillna(prior)
    return encoded_values, mapping, prior


# ---- Load data ----
# Expected columns: ship_date (datetime), origin_zone, dest_zone, carrier, service_level,
# package characteristics, transit_time_days (target), shipping_cost_usd (target)
df = pd.read_parquet("historical_shipments.parquet")  # or CSV
df = df.dropna(subset=["transit_time_days", "shipping_cost_usd", "ship_date"])

# ---- Feature engineering ----
df["ship_date"] = pd.to_datetime(df["ship_date"])
df["dow"] = df["ship_date"].dt.weekday  # 0=Mon
df["month"] = df["ship_date"].dt.month
df["day_of_year"] = df["ship_date"].dt.dayofyear
df = cyclical_encode(df, "dow", 7)
df = cyclical_encode(df, "month", 12)

# route feature
df["route"] = df["origin_zone"].astype(str) + "->" + df["dest_zone"].astype(str)
df["origin_service"] = (
    df["origin_zone"].astype(str) + "::" + df["service_level"].astype(str)
)
df["carrier_service"] = (
    df["carrier"].astype(str) + "::" + df["service_level"].astype(str)
)

# Package features
df["package_volume"] = (
    df["package_length_in"] * df["package_width_in"] * df["package_height_in"]
)
df["dimensional_weight"] = df["package_volume"] / 166  # Standard DIM factor
df["billable_weight"] = np.maximum(df["package_weight_lbs"], df["dimensional_weight"])
df["weight_to_volume_ratio"] = df["package_weight_lbs"] / (
    df["package_volume"] + 1
)  # +1 to avoid division by zero

# sort by date for time-based splitting
df = df.sort_values("ship_date").reset_index(drop=True)

# Create rolling historical features: prior 30-day median for both transit time and cost per route
window_days = 30
df["ship_date_int"] = df["ship_date"].astype(np.int64) // 10**9  # seconds
route_median_time = {}
route_median_cost = {}
rolling_med_time = []
rolling_med_cost = []
for idx, row in df.iterrows():
    route = row["route"]
    cutoff = row["ship_date"] - pd.Timedelta(days=window_days)
    # naive filter (can be optimized/groupby for large datasets)
    past = df[
        (df["route"] == route)
        & (df["ship_date"] < row["ship_date"])
        & (df["ship_date"] >= cutoff)
    ]
    if len(past):
        rolling_med_time.append(past["transit_time_days"].median())
        rolling_med_cost.append(past["shipping_cost_usd"].median())
    else:
        rolling_med_time.append(np.nan)
        rolling_med_cost.append(np.nan)
df["route_30d_median_time"] = rolling_med_time
df["route_30d_median_cost"] = rolling_med_cost
df["route_30d_median_time"] = df["route_30d_median_time"].fillna(
    df["transit_time_days"].median()
)
df["route_30d_median_cost"] = df["route_30d_median_cost"].fillna(
    df["shipping_cost_usd"].median()
)

# ---- Train / validation split (time-based) ----
# Use last 20% of time as validation
split_idx = int(len(df) * 0.8)
train_df = df.iloc[:split_idx].copy()
valid_df = df.iloc[split_idx:].copy()

# ---- Encoding high-cardinality categoricals: target-smoothing on train, map to valid ----
target_encodings_time = {}
target_encodings_cost = {}
priors = {}

for col in [
    "route",
    "origin_zone",
    "dest_zone",
    "carrier",
    "service_level",
    "origin_service",
    "carrier_service",
]:
    # For transit time
    valid_df[f"{col}_te_time"], mapping_time, prior_time = target_encode_smooth(
        train_df, valid_df, col, "transit_time_days", min_samples_leaf=200, smoothing=20
    )
    train_df[f"{col}_te_time"], _, _ = target_encode_smooth(
        train_df, train_df, col, "transit_time_days", min_samples_leaf=200, smoothing=20
    )

    # For shipping cost
    valid_df[f"{col}_te_cost"], mapping_cost, prior_cost = target_encode_smooth(
        train_df, valid_df, col, "shipping_cost_usd", min_samples_leaf=200, smoothing=20
    )
    train_df[f"{col}_te_cost"], _, _ = target_encode_smooth(
        train_df, train_df, col, "shipping_cost_usd", min_samples_leaf=200, smoothing=20
    )

    # Store mappings for inference
    target_encodings_time[col] = mapping_time
    target_encodings_cost[col] = mapping_cost

# Store priors (global means for unseen categories)
priors["transit_time_days"] = train_df["transit_time_days"].mean()
priors["shipping_cost_usd"] = train_df["shipping_cost_usd"].mean()

# ---- Feature lists ----
# Features for transit time prediction
time_feature_cols = [
    "dow_sin",
    "dow_cos",
    "month_sin",
    "month_cos",
    "package_weight_lbs",
    "package_volume",
    "dimensional_weight",
    "billable_weight",
    "weight_to_volume_ratio",
    "route_30d_median_time",
    # target-encoded categorical features for time
    "route_te_time",
    "origin_zone_te_time",
    "dest_zone_te_time",
    "carrier_te_time",
    "service_level_te_time",
    "origin_service_te_time",
    "carrier_service_te_time",
]

# Features for cost prediction
cost_feature_cols = [
    "dow_sin",
    "dow_cos",
    "month_sin",
    "month_cos",
    "package_weight_lbs",
    "package_volume",
    "dimensional_weight",
    "billable_weight",
    "weight_to_volume_ratio",
    "route_30d_median_cost",
    # target-encoded categorical features for cost
    "route_te_cost",
    "origin_zone_te_cost",
    "dest_zone_te_cost",
    "carrier_te_cost",
    "service_level_te_cost",
    "origin_service_te_cost",
    "carrier_service_te_cost",
]
# Prepare datasets for both models
X_train_time = train_df[time_feature_cols]
y_train_time = train_df["transit_time_days"]
X_valid_time = valid_df[time_feature_cols]
y_valid_time = valid_df["transit_time_days"]

X_train_cost = train_df[cost_feature_cols]
y_train_cost = train_df["shipping_cost_usd"]
X_valid_cost = valid_df[cost_feature_cols]
y_valid_cost = valid_df["shipping_cost_usd"]

# ---- LightGBM datasets ----
lgb_train_time = lgb.Dataset(X_train_time, label=y_train_time)
lgb_valid_time = lgb.Dataset(X_valid_time, label=y_valid_time, reference=lgb_train_time)

lgb_train_cost = lgb.Dataset(X_train_cost, label=y_train_cost)
lgb_valid_cost = lgb.Dataset(X_valid_cost, label=y_valid_cost, reference=lgb_train_cost)

# ---- Training parameters ----
params_time = {
    "objective": "regression_l1",
    "metric": ["l1", "l2"],
    "boosting_type": "gbdt",
    "num_leaves": 64,
    "learning_rate": 0.05,
    "feature_fraction": 0.8,
    "bagging_fraction": 0.8,
    "bagging_freq": 5,
    "min_data_in_leaf": 100,
    "verbose": -1,
    "seed": 42,
}

params_cost = {
    "objective": "regression_l1",
    "metric": ["l1", "l2"],
    "boosting_type": "gbdt",
    "num_leaves": 64,
    "learning_rate": 0.05,
    "feature_fraction": 0.8,
    "bagging_fraction": 0.8,
    "bagging_freq": 5,
    "min_data_in_leaf": 100,
    "verbose": -1,
    "seed": 42,
}

print("Training Transit Time Model...")
callbacks_time = [lgb.early_stopping(150), lgb.log_evaluation(100)]
bst_time = lgb.train(
    params_time,
    lgb_train_time,
    num_boost_round=5000,
    valid_sets=[lgb_train_time, lgb_valid_time],
    callbacks=callbacks_time,
)

print("\nTraining Shipping Cost Model...")
callbacks_cost = [lgb.early_stopping(150), lgb.log_evaluation(100)]
bst_cost = lgb.train(
    params_cost,
    lgb_train_cost,
    num_boost_round=5000,
    valid_sets=[lgb_train_cost, lgb_valid_cost],
    callbacks=callbacks_cost,
)

# ---- Evaluation ----
print("\n=== Transit Time Model Evaluation ===")
pred_valid_time = bst_time.predict(X_valid_time, num_iteration=bst_time.best_iteration)
mae_time = mean_absolute_error(y_valid_time, pred_valid_time)
rmse_time = np.sqrt(mean_squared_error(y_valid_time, pred_valid_time))
print(f"Transit Time - Validation MAE: {mae_time:.4f} days, RMSE: {rmse_time:.4f} days")

print("\n=== Shipping Cost Model Evaluation ===")
pred_valid_cost = bst_cost.predict(X_valid_cost, num_iteration=bst_cost.best_iteration)
mae_cost = mean_absolute_error(y_valid_cost, pred_valid_cost)
rmse_cost = np.sqrt(mean_squared_error(y_valid_cost, pred_valid_cost))
print(f"Shipping Cost - Validation MAE: ${mae_cost:.2f}, RMSE: ${rmse_cost:.2f}")

# ---- Quantile estimation for transit time (example using separate models for 10th/50th/90th quantiles) ----
print("\n=== Training Transit Time Quantile Models ===")
quantiles = [0.1, 0.5, 0.9]
quantile_models_time = {}
for q in quantiles:
    p = params_time.copy()
    p["objective"] = "quantile"
    p["alpha"] = q
    mdl = lgb.train(p, lgb_train_time, num_boost_round=bst_time.best_iteration)
    quantile_models_time[q] = mdl
    valid_q_pred = mdl.predict(X_valid_time)
    print(
        f"Transit Time Quantile {q} sample MAE: {mean_absolute_error(y_valid_time, valid_q_pred):.4f}"
    )

# ---- Quantile estimation for shipping cost ----
print("\n=== Training Shipping Cost Quantile Models ===")
quantile_models_cost = {}
for q in quantiles:
    p = params_cost.copy()
    p["objective"] = "quantile"
    p["alpha"] = q
    mdl = lgb.train(p, lgb_train_cost, num_boost_round=bst_cost.best_iteration)
    quantile_models_cost[q] = mdl
    valid_q_pred = mdl.predict(X_valid_cost)
    print(
        f"Shipping Cost Quantile {q} sample MAE: ${mean_absolute_error(y_valid_cost, valid_q_pred):.2f}"
    )

# ---- Save models and metadata ----
bst_time.save_model("lgb_transit_time_model.txt")
bst_cost.save_model("lgb_shipping_cost_model.txt")

for q, m in quantile_models_time.items():
    m.save_model(f"lgb_transit_time_quantile_{int(q*100)}.txt")

for q, m in quantile_models_cost.items():
    m.save_model(f"lgb_shipping_cost_quantile_{int(q*100)}.txt")

# Save feature columns for both models
dump(time_feature_cols, "time_feature_cols.joblib")
dump(cost_feature_cols, "cost_feature_cols.joblib")

# Save target encoding mappings for inference
dump(target_encodings_time, "target_encodings_time.joblib")
dump(target_encodings_cost, "target_encodings_cost.joblib")
dump(priors, "target_encoding_priors.joblib")

# Copy all model files to the inference server directory
import shutil
import os

inference_dir = "../fastify-inference-server/onnx_models"
if not os.path.exists(inference_dir):
    os.makedirs(inference_dir)

# Files to copy to inference server
model_files = [
    "lgb_transit_time_model.txt",
    "lgb_shipping_cost_model.txt",
    "time_feature_cols.joblib",
    "cost_feature_cols.joblib",
    "target_encodings_time.joblib",
    "target_encodings_cost.joblib",
    "target_encoding_priors.joblib",
]

print(f"\nCopying model files to inference server...")
for file in model_files:
    if os.path.exists(file):
        shutil.copy2(file, inference_dir)
        print(f"- Copied {file} to {inference_dir}")
    else:
        print(f"- WARNING: {file} not found, skipping")

print(f"\nModels saved:")
print(f"- Transit Time: lgb_transit_time_model.txt")
print(f"- Shipping Cost: lgb_shipping_cost_model.txt")
print(f"- Feature columns: time_feature_cols.joblib, cost_feature_cols.joblib")
print(f"- Target encodings: target_encodings_time.joblib, target_encodings_cost.joblib")
print(f"- Target encoding priors: target_encoding_priors.joblib")
print(f"- Quantile models saved for both targets")
print(f"- All files copied to inference server: {inference_dir}")

# ---- Update Training Metadata ----
print(f"\n=== Updating Training Metadata ===")
try:
    # Add timing import at the end to avoid conflicts
    import time
    import sys
    import os

    # Add the parent directory to the path to import our utility
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

    from training_metadata_utils import update_training_metadata

    # Calculate training duration (approximate)
    # In a real scenario, you'd capture start_time at the beginning
    # For now, we'll use a placeholder
    training_duration = 5.0  # Placeholder - should be actual duration

    # Update metadata with training information
    update_training_metadata(
        data_file_path="transit_time_cost/historical_shipments.parquet",
        model_version="1.1.0",
        training_duration_minutes=training_duration,
        validation_metrics={
            "transit_time_mae": mae_time,
            "shipping_cost_mae": mae_cost,
        },
        additional_data_sources=[
            "statistical_analysis/statistical_shipping_data.parquet"
        ],
    )

    print("✅ Training metadata updated successfully!")

except Exception as e:
    print(f"⚠️ Warning: Failed to update training metadata: {e}")
    print("Training completed successfully, but metadata update failed.")
