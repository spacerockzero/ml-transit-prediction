"""
Simple inference script for transit time predictions.
Usage: python simple_predict.py
"""

import pandas as pd
import numpy as np
import lightgbm as lgb
from joblib import load
from datetime import datetime, timedelta

def predict_transit_time(ship_date, origin_zone, dest_zone, carrier, service_level,
                        model_path="lgb_transit_model.txt",
                        feature_cols_path="feature_cols.joblib", 
                        historical_data_path="historical_shipments.parquet"):
    """
    Simple function to predict transit time for a single shipment.
    
    Args:
        ship_date: Date of shipment (string like '2024-01-15' or datetime)
        origin_zone: Origin zone (e.g., 'US_WEST', 'EU_WEST')
        dest_zone: Destination zone (e.g., 'US_EAST', 'ASIA_EAST') 
        carrier: Carrier name (e.g., 'FedEx', 'UPS', 'DHL')
        service_level: Service level (e.g., 'EXPRESS', 'STANDARD', 'OVERNIGHT')
        
    Returns:
        Predicted transit time in days (float)
        
    Example:
        >>> prediction = predict_transit_time('2024-01-15', 'US_WEST', 'US_EAST', 'FedEx', 'EXPRESS')
        >>> print(f"Expected transit time: {prediction} days")
    """
    
    # Load model and data
    model = lgb.Booster(model_file=model_path)
    feature_cols = load(feature_cols_path)
    historical_data = pd.read_parquet(historical_data_path)
    historical_data['ship_date'] = pd.to_datetime(historical_data['ship_date'])
    
    # Create input dataframe
    df = pd.DataFrame({
        'ship_date': [pd.to_datetime(ship_date)],
        'origin_zone': [origin_zone],
        'dest_zone': [dest_zone], 
        'carrier': [carrier],
        'service_level': [service_level]
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
    
    # 4. Rolling historical median (30-day window)
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
        df['route_30d_median'] = historical_route['transit_time_days'].median()
    else:
        df['route_30d_median'] = historical_data['transit_time_days'].median()
    
    # 5. Target encoding (using all historical data)
    global_mean = historical_data['transit_time_days'].mean()
    
    # Add route and combination features to historical data for encoding
    hist_with_features = historical_data.copy()
    hist_with_features['route'] = hist_with_features['origin_zone'] + '->' + hist_with_features['dest_zone']
    hist_with_features['origin_service'] = hist_with_features['origin_zone'] + '::' + hist_with_features['service_level']
    hist_with_features['carrier_service'] = hist_with_features['carrier'] + '::' + hist_with_features['service_level']
    
    for col in ['route', 'origin_zone', 'dest_zone', 'carrier', 'service_level', 'origin_service', 'carrier_service']:
        # Calculate mean for each category with smoothing
        cat_stats = hist_with_features.groupby(col)['transit_time_days'].agg(['count', 'mean']).fillna(0)
        
        # Apply smoothing based on sample size
        min_samples = 100
        smoothing_factor = 10
        smoothing_weight = 1 / (1 + np.exp(-(cat_stats['count'] - min_samples) / smoothing_factor))
        smoothed_mean = global_mean * (1 - smoothing_weight) + cat_stats['mean'] * smoothing_weight
        
        # Map to current data
        category_value = df[col].iloc[0]
        if category_value in smoothed_mean.index:
            df[f'{col}_te'] = smoothed_mean[category_value]
        else:
            df[f'{col}_te'] = global_mean
    
    # 6. Select features and predict
    X = df[feature_cols]
    prediction = model.predict(X)[0]
    
    return round(prediction, 2)


if __name__ == "__main__":
    # Test examples with USPS zones
    print("=== USPS Zone Transit Time Prediction Examples ===\n")
    
    # Example 1: Local delivery (Zone 1 to Zone 1)
    pred1 = predict_transit_time('2024-01-15', 'Zone_1', 'Zone_1', 'USPS', 'PRIORITY')
    print(f"Zone 1 -> Zone 1, USPS Priority (Local): {pred1} days")
    
    # Example 2: Short distance (Zone 1 to Zone 3)
    pred2 = predict_transit_time('2024-01-15', 'Zone_1', 'Zone_3', 'FedEx', 'EXPRESS') 
    print(f"Zone 1 -> Zone 3, FedEx Express: {pred2} days")
    
    # Example 3: Medium distance (Zone 2 to Zone 6)
    pred3 = predict_transit_time('2024-01-15', 'Zone_2', 'Zone_6', 'UPS', 'STANDARD')
    print(f"Zone 2 -> Zone 6, UPS Standard: {pred3} days")
    
    # Example 4: Long distance (Zone 1 to Zone 9)
    pred4 = predict_transit_time('2024-01-15', 'Zone_1', 'Zone_9', 'USPS', 'STANDARD')
    print(f"Zone 1 -> Zone 9, USPS Standard (Cross-country): {pred4} days")
    
    # Example 5: Weekend effect
    pred5 = predict_transit_time('2024-01-13', 'Zone_3', 'Zone_7', 'FedEx', 'EXPRESS')  # Saturday
    print(f"Zone 3 -> Zone 7, FedEx Express (Saturday): {pred5} days")
    
    print("\n=== Interactive Prediction ===")
    print("You can use this function in your code like:")
    print("prediction = predict_transit_time('2024-01-15', 'Zone_1', 'Zone_5', 'UPS', 'EXPRESS')")
    print("\nAvailable USPS Zones: Zone_1, Zone_2, Zone_3, Zone_4, Zone_5, Zone_6, Zone_7, Zone_8, Zone_9")
    print("Zone_1 = Local delivery, Zone_9 = Furthest distance")