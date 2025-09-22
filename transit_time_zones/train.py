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
    agg = train.groupby(col)[target].agg(['count','mean']).rename(columns={'count':'n','mean':'mean'})
    agg['smoothing'] = 1 / (1 + np.exp(-(agg['n'] - min_samples_leaf) / smoothing))
    agg['enc'] = prior * (1 - agg['smoothing']) + agg['mean'] * agg['smoothing']
    mapping = agg['enc'].to_dict()
    return valid[col].map(mapping).fillna(prior)

# ---- Load data ----
# Expected columns: ship_date (datetime), origin_zone, dest_zone, carrier, service_level,
# day_of_week (0-6) or derived, month (1-12) or derived, transit_time_days (target)
df = pd.read_parquet("historical_shipments.parquet")  # or CSV
df = df.dropna(subset=['transit_time_days', 'ship_date'])

# ---- Feature engineering ----
df['ship_date'] = pd.to_datetime(df['ship_date'])
df['dow'] = df['ship_date'].dt.weekday  # 0=Mon
df['month'] = df['ship_date'].dt.month
df['day_of_year'] = df['ship_date'].dt.dayofyear
df = cyclical_encode(df, 'dow', 7)
df = cyclical_encode(df, 'month', 12)

# route feature
df['route'] = df['origin_zone'].astype(str) + '->' + df['dest_zone'].astype(str)
df['origin_service'] = df['origin_zone'].astype(str) + '::' + df['service_level'].astype(str)
df['carrier_service'] = df['carrier'].astype(str) + '::' + df['service_level'].astype(str)

# sort by date for time-based splitting
df = df.sort_values('ship_date').reset_index(drop=True)

# Create rolling historical features: prior 30-day median transit time per route (simple example)
window_days = 30
df['ship_date_int'] = df['ship_date'].astype(np.int64) // 10**9  # seconds
route_median = {}
rolling_med = []
for idx, row in df.iterrows():
    route = row['route']
    cutoff = row['ship_date'] - pd.Timedelta(days=window_days)
    key = (route, )
    # naive filter (can be optimized/groupby for large datasets)
    past = df[(df['route'] == route) & (df['ship_date'] < row['ship_date']) & (df['ship_date'] >= cutoff)]
    if len(past):
        rolling_med.append(past['transit_time_days'].median())
    else:
        rolling_med.append(np.nan)
df['route_30d_median'] = rolling_med
df['route_30d_median'] = df['route_30d_median'].fillna(df['transit_time_days'].median())

# ---- Train / validation split (time-based) ----
# Use last 20% of time as validation
split_idx = int(len(df) * 0.8)
train_df = df.iloc[:split_idx].copy()
valid_df = df.iloc[split_idx:].copy()

# ---- Encoding high-cardinality categoricals: target-smoothing on train, map to valid ----
for col in ['route', 'origin_zone', 'dest_zone', 'carrier', 'service_level', 'origin_service', 'carrier_service']:
    valid_df[f'{col}_te'] = target_encode_smooth(train_df, valid_df, col, 'transit_time_days',
                                                 min_samples_leaf=200, smoothing=20)
    train_df[f'{col}_te'] = target_encode_smooth(train_df, train_df, col, 'transit_time_days',
                                                 min_samples_leaf=200, smoothing=20)

# ---- Feature lists ----
feature_cols = [
    'dow_sin','dow_cos','month_sin','month_cos',
    'route_30d_median',
    # target-encoded categorical features
    'route_te','origin_zone_te','dest_zone_te','carrier_te','service_level_te',
    'origin_service_te','carrier_service_te'
]
X_train = train_df[feature_cols]
y_train = train_df['transit_time_days']
X_valid = valid_df[feature_cols]
y_valid = valid_df['transit_time_days']

# ---- LightGBM dataset ----
lgb_train = lgb.Dataset(X_train, label=y_train)
lgb_valid = lgb.Dataset(X_valid, label=y_valid, reference=lgb_train)

# ---- Training with MAE objective (L1) for robust median-aligned predictions ----
params = {
    'objective': 'regression_l1',
    'metric': ['l1','l2'],
    'boosting_type': 'gbdt',
    'num_leaves': 64,
    'learning_rate': 0.05,
    'feature_fraction': 0.8,
    'bagging_fraction': 0.8,
    'bagging_freq': 5,
    'min_data_in_leaf': 100,
    'verbose': -1,
    'seed': 42
}

callbacks = [lgb.early_stopping(150), lgb.log_evaluation(100)]
bst = lgb.train(params,
                lgb_train,
                num_boost_round=5000,
                valid_sets=[lgb_train, lgb_valid],
                callbacks=callbacks)

# ---- Evaluation ----
pred_valid = bst.predict(X_valid, num_iteration=bst.best_iteration)
mae = mean_absolute_error(y_valid, pred_valid)
rmse = np.sqrt(mean_squared_error(y_valid, pred_valid))
print(f"Validation MAE: {mae:.4f}, RMSE: {rmse:.4f}")

# ---- Quantile estimation (example using separate models for 10th/50th/90th quantiles) ----
quantiles = [0.1, 0.5, 0.9]
quantile_models = {}
for q in quantiles:
    p = params.copy()
    p['objective'] = 'quantile'
    p['alpha'] = q
    mdl = lgb.train(p, lgb_train, num_boost_round=bst.best_iteration)
    quantile_models[q] = mdl
    valid_q_pred = mdl.predict(X_valid)
    print(f"Quantile {q} sample MAE: {mean_absolute_error(y_valid, valid_q_pred):.4f}")

# ---- Save model and metadata ----
bst.save_model("lgb_transit_model.txt")
for q, m in quantile_models.items():
    m.save_model(f"lgb_transit_quantile_{int(q*100)}.txt")
dump(feature_cols, "feature_cols.joblib")
