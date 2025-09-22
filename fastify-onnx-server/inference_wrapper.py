#!/usr/bin/env python3
"""
Python inference wrapper for LightGBM models.
This script is called by the Node.js server to perform predictions.
"""

import json
import sys
import numpy as np
import pandas as pd
import lightgbm as lgb
from joblib import load
from datetime import datetime, timedelta

def load_models_and_features():
    """Load the LightGBM models and feature columns."""
    try:
        # Load models
        time_model = lgb.Booster(model_file="onnx_models/lgb_transit_time_model.txt")
        cost_model = lgb.Booster(model_file="onnx_models/lgb_shipping_cost_model.txt")
        
        # Load feature columns
        time_features = load("onnx_models/time_feature_cols.joblib")
        cost_features = load("onnx_models/cost_feature_cols.joblib")
        
        return time_model, cost_model, time_features, cost_features
    except Exception as e:
        raise Exception(f"Error loading models: {e}")

def engineer_features(input_data, historical_data=None):
    """Apply the same feature engineering as in the training pipeline."""
    df = pd.DataFrame([input_data])
    
    # Ensure ship_date is datetime - use today if not provided
    if 'ship_date' not in df.columns or pd.isna(df['ship_date'].iloc[0]):
        df['ship_date'] = datetime.now().strftime('%Y-%m-%d')
    
    df['ship_date'] = pd.to_datetime(df['ship_date'])
    
    # 1. Date features
    df['dow'] = df['ship_date'].dt.weekday  # 0=Monday
    df['month'] = df['ship_date'].dt.month
    
    # 2. Cyclical encoding
    df['dow_sin'] = np.sin(2 * np.pi * df['dow'] / 7)
    df['dow_cos'] = np.cos(2 * np.pi * df['dow'] / 7)
    df['month_sin'] = np.sin(2 * np.pi * df['month'] / 12)
    df['month_cos'] = np.cos(2 * np.pi * df['month'] / 12)
    
    # 3. Route and combination features
    # Ensure zones are strings for concatenation
    df['origin_zone'] = df['origin_zone'].astype(str)
    df['dest_zone'] = df['dest_zone'].astype(str)
    
    df['route'] = df['origin_zone'] + '->' + df['dest_zone']
    df['origin_service'] = df['origin_zone'] + '::' + df['service_level']
    df['carrier_service'] = df['carrier'] + '::' + df['service_level']
    
    # 4. Package features
    df['package_volume'] = df['package_length_in'] * df['package_width_in'] * df['package_height_in']
    df['dimensional_weight'] = df['package_volume'] / 166  # Standard DIM factor
    df['billable_weight'] = np.maximum(df['package_weight_lbs'], df['dimensional_weight'])
    df['weight_to_volume_ratio'] = df['package_weight_lbs'] / (df['package_volume'] + 1)
    
    # 5. Rolling historical features (simplified - use global medians for server)
    # In production, you'd maintain a real historical database
    df['route_30d_median_time'] = 4.0  # Global median transit time
    df['route_30d_median_cost'] = 15.0  # Global median cost
    
    # 6. Target encoding (simplified - use global means for server)
    # In production, you'd maintain the actual encodings
    global_mean_time = 4.0
    global_mean_cost = 15.0
    
    for col in ['route', 'origin_zone', 'dest_zone', 'carrier', 'service_level', 'origin_service', 'carrier_service']:
        df[f'{col}_te_time'] = global_mean_time
        df[f'{col}_te_cost'] = global_mean_cost
    
    return df

def predict(input_data):
    """Make predictions for both transit time and shipping cost."""
    try:
        # Load models and features
        time_model, cost_model, time_features, cost_features = load_models_and_features()
        
        # Engineer features
        df = engineer_features(input_data)
        
        # Prepare feature arrays
        X_time = df[time_features].values.astype(np.float32)
        X_cost = df[cost_features].values.astype(np.float32)
        
        # Make predictions
        time_pred = time_model.predict(X_time)[0]
        cost_pred = cost_model.predict(X_cost)[0]
        
        return {
            "success": True,
            "predictions": {
                "transit_time_days": round(float(time_pred), 2),
                "shipping_cost_usd": round(float(cost_pred), 2)
            },
            "input": input_data
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "input": input_data
        }

def main():
    """Main function for command line usage."""
    if len(sys.argv) != 2:
        print(json.dumps({"success": False, "error": "Usage: python inference_wrapper.py '<json_input>'"}))
        return 1
    
    try:
        # Parse input JSON
        input_json = sys.argv[1]
        input_data = json.loads(input_json)
        
        # Validate required fields
        required_fields = [
            'ship_date', 'origin_zone', 'dest_zone', 'carrier', 'service_level',
            'package_weight_lbs', 'package_length_in', 'package_width_in', 'package_height_in'
        ]
        
        missing_fields = [field for field in required_fields if field not in input_data]
        if missing_fields:
            result = {
                "success": False,
                "error": f"Missing required fields: {missing_fields}",
                "required_fields": required_fields
            }
        else:
            # Make prediction
            result = predict(input_data)
        
        # Output result as JSON
        print(json.dumps(result))
        return 0
        
    except json.JSONDecodeError as e:
        print(json.dumps({"success": False, "error": f"Invalid JSON input: {e}"}))
        return 1
    except Exception as e:
        print(json.dumps({"success": False, "error": f"Unexpected error: {e}"}))
        return 1

if __name__ == "__main__":
    exit(main())