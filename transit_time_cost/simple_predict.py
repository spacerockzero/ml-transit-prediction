"""
Simple inference script for transit time predictions.
Usage: python simple_predict.py
"""

import pandas as pd
import numpy as np
import lightgbm as lgb
from joblib import load
from datetime import datetime, timedelta

def predict_transit_time_and_cost(ship_date, origin_zone, dest_zone, carrier, service_level,
                                   package_weight_lbs, package_length_in, package_width_in, package_height_in,
                                   time_model_path="lgb_transit_time_model.txt",
                                   cost_model_path="lgb_shipping_cost_model.txt",
                                   time_feature_cols_path="time_feature_cols.joblib",
                                   cost_feature_cols_path="cost_feature_cols.joblib", 
                                   historical_data_path="historical_shipments.parquet"):
    """
    Function to predict both transit time and shipping cost for a single shipment.
    
    Args:
        ship_date: Date of shipment (string like '2024-01-15' or datetime)
        origin_zone: Origin zone (e.g., 'US_WEST', 'EU_WEST')
        dest_zone: Destination zone (e.g., 'US_EAST', 'ASIA_EAST') 
        carrier: Carrier name (e.g., 'FedEx', 'UPS', 'DHL')
        service_level: Service level (e.g., 'EXPRESS', 'STANDARD', 'OVERNIGHT')
        package_weight_lbs: Package weight in pounds
        package_length_in: Package length in inches
        package_width_in: Package width in inches  
        package_height_in: Package height in inches
        
    Returns:
        Dict with predicted transit time (days) and shipping cost (USD)
        
    Example:
        >>> result = predict_transit_time_and_cost('2024-01-15', 'US_WEST', 'US_EAST', 'FedEx', 'EXPRESS', 2.5, 10, 8, 6)
        >>> print(f"Transit time: {result['transit_time_days']} days, Cost: ${result['shipping_cost_usd']}")
    """
    
    # Load models and data
    time_model = lgb.Booster(model_file=time_model_path)
    cost_model = lgb.Booster(model_file=cost_model_path)
    time_feature_cols = load(time_feature_cols_path)
    cost_feature_cols = load(cost_feature_cols_path)
    historical_data = pd.read_parquet(historical_data_path)
    historical_data['ship_date'] = pd.to_datetime(historical_data['ship_date'])
    
    # Create input dataframe
    df = pd.DataFrame({
        'ship_date': [pd.to_datetime(ship_date)],
        'origin_zone': [origin_zone],
        'dest_zone': [dest_zone], 
        'carrier': [carrier],
        'service_level': [service_level],
        'package_weight_lbs': [package_weight_lbs],
        'package_length_in': [package_length_in],
        'package_width_in': [package_width_in],
        'package_height_in': [package_height_in]
    })
    
    # Feature engineering
    
    # 1. Date features
    df['dow'] = df['ship_date'].dt.weekday  # 0=Monday
    df['month'] = df['ship_date'].dt.month
    
    # 2. Cyclical encoding
    df['dow_sin'] = np.sin(2 * np.pi * df['dow'] / 7)
    df['dow_cos'] = np.cos(2 * np.pi * df['dow'] / 7)
    df['month_sin'] = np.sin(2 * np.pi * df['month'] / 12)
    df['month_cos'] = np.cos(2 * np.pi * df['month'] / 12)
    
    # 3. Route and combination features
    df['route'] = df['origin_zone'] + '->' + df['dest_zone']
    df['origin_service'] = df['origin_zone'] + '::' + df['service_level']
    df['carrier_service'] = df['carrier'] + '::' + df['service_level']
    
    # 4. Package features
    df['package_volume'] = df['package_length_in'] * df['package_width_in'] * df['package_height_in']
    df['dimensional_weight'] = df['package_volume'] / 166  # Standard DIM factor
    df['billable_weight'] = np.maximum(df['package_weight_lbs'], df['dimensional_weight'])
    df['weight_to_volume_ratio'] = df['package_weight_lbs'] / (df['package_volume'] + 1)  # +1 to avoid division by zero
    
    # 5. Rolling historical median (30-day window)
    route = df['route'].iloc[0]
    ship_date_val = df['ship_date'].iloc[0]
    cutoff = ship_date_val - timedelta(days=30)
    
    # Filter historical data for same route in time window
    historical_route = historical_data[
        (historical_data['origin_zone'] + '->' + historical_data['dest_zone'] == route) &
        (historical_data['ship_date'] < ship_date_val) &
        (historical_data['ship_date'] >= cutoff)
    ]
    
    if len(historical_route) > 0:
        df['route_30d_median_time'] = historical_route['transit_time_days'].median()
        df['route_30d_median_cost'] = historical_route['shipping_cost_usd'].median()
    else:
        df['route_30d_median_time'] = historical_data['transit_time_days'].median()
        df['route_30d_median_cost'] = historical_data['shipping_cost_usd'].median()
    
    # 6. Target encoding (using all historical data)
    global_mean_time = historical_data['transit_time_days'].mean()
    global_mean_cost = historical_data['shipping_cost_usd'].mean()
    
    # Add route and combination features to historical data for encoding
    hist_with_features = historical_data.copy()
    hist_with_features['route'] = hist_with_features['origin_zone'] + '->' + hist_with_features['dest_zone']
    hist_with_features['origin_service'] = hist_with_features['origin_zone'] + '::' + hist_with_features['service_level']
    hist_with_features['carrier_service'] = hist_with_features['carrier'] + '::' + hist_with_features['service_level']
    
    for col in ['route', 'origin_zone', 'dest_zone', 'carrier', 'service_level', 'origin_service', 'carrier_service']:
        # Calculate mean for each category with smoothing - for time
        cat_stats_time = hist_with_features.groupby(col)['transit_time_days'].agg(['count', 'mean']).fillna(0)
        min_samples = 100
        smoothing_factor = 10
        smoothing_weight = 1 / (1 + np.exp(-(cat_stats_time['count'] - min_samples) / smoothing_factor))
        smoothed_mean_time = global_mean_time * (1 - smoothing_weight) + cat_stats_time['mean'] * smoothing_weight
        
        # Calculate mean for each category with smoothing - for cost
        cat_stats_cost = hist_with_features.groupby(col)['shipping_cost_usd'].agg(['count', 'mean']).fillna(0)
        smoothing_weight = 1 / (1 + np.exp(-(cat_stats_cost['count'] - min_samples) / smoothing_factor))
        smoothed_mean_cost = global_mean_cost * (1 - smoothing_weight) + cat_stats_cost['mean'] * smoothing_weight
        
        # Map to current data
        category_value = df[col].iloc[0]
        if category_value in smoothed_mean_time.index:
            df[f'{col}_te_time'] = smoothed_mean_time[category_value]
        else:
            df[f'{col}_te_time'] = global_mean_time
            
        if category_value in smoothed_mean_cost.index:
            df[f'{col}_te_cost'] = smoothed_mean_cost[category_value]
        else:
            df[f'{col}_te_cost'] = global_mean_cost
    
    # 7. Select features and predict
    X_time = df[time_feature_cols]
    X_cost = df[cost_feature_cols]
    
    time_prediction = time_model.predict(X_time)[0]
    cost_prediction = cost_model.predict(X_cost)[0]
    
    return {
        'transit_time_days': round(time_prediction, 2),
        'shipping_cost_usd': round(cost_prediction, 2)
    }


if __name__ == "__main__":
    # Test examples with USPS zones and cost/time prediction
    print("=== USPS Zone Transit Time and Shipping Cost Prediction Examples ===\n")
    
    # Example 1: Small local package (Zone 1 to Zone 1)
    pred1 = predict_transit_time_and_cost('2024-01-15', 'Zone_1', 'Zone_1', 'USPS', 'PRIORITY', 1.0, 8, 6, 4)
    print(f"Local Priority Package: {pred1['transit_time_days']} days, ${pred1['shipping_cost_usd']}")
    
    # Example 2: Medium distance express (Zone 2 to Zone 6)  
    pred2 = predict_transit_time_and_cost('2024-01-15', 'Zone_2', 'Zone_6', 'FedEx', 'EXPRESS', 3.5, 12, 9, 6)
    print(f"Medium Distance Express: {pred2['transit_time_days']} days, ${pred2['shipping_cost_usd']}")
    
    # Example 3: Cross-country overnight (Zone 1 to Zone 9)
    pred3 = predict_transit_time_and_cost('2024-01-15', 'Zone_1', 'Zone_9', 'UPS', 'OVERNIGHT', 2.0, 10, 8, 5)
    print(f"Cross-country Overnight: {pred3['transit_time_days']} days, ${pred3['shipping_cost_usd']}")
    
    # Example 4: Heavy economy package (Zone 3 to Zone 7)
    pred4 = predict_transit_time_and_cost('2024-01-15', 'Zone_3', 'Zone_7', 'USPS', 'ECONOMY', 15.0, 18, 14, 10)
    print(f"Heavy Economy Package: {pred4['transit_time_days']} days, ${pred4['shipping_cost_usd']}")
    
    # Example 5: Small standard package (Zone 4 to Zone 5)
    pred5 = predict_transit_time_and_cost('2024-01-15', 'Zone_4', 'Zone_5', 'Amazon_Logistics', 'STANDARD', 0.8, 6, 4, 3)
    print(f"Small Standard Package: {pred5['transit_time_days']} days, ${pred5['shipping_cost_usd']}")
    
    print("\n=== Interactive Prediction ===")
    print("You can use this function in your code like:")
    print("result = predict_transit_time_and_cost('2024-01-15', 'Zone_1', 'Zone_5', 'UPS', 'EXPRESS', 2.5, 10, 8, 6)")
    print("print(f'Transit time: {result[\"transit_time_days\"]} days, Cost: ${result[\"shipping_cost_usd\"]}')")
    print("\nAvailable USPS Zones: Zone_1, Zone_2, Zone_3, Zone_4, Zone_5, Zone_6, Zone_7, Zone_8, Zone_9")
    print("Zone_1 = Local delivery, Zone_9 = Cross-country")
    print("Package dimensions are in inches (length, width, height)")
    print("Package weight is in pounds")