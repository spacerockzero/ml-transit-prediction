#!/usr/bin/env python3
"""
Convert LightGBM models to ONNX format for use in Node.js/Fastify server
"""

import numpy as np
import pandas as pd
import lightgbm as lgb
from joblib import load
import onnxmltools
from onnxmltools.convert import convert_lightgbm
from skl2onnx.common.data_types import FloatTensorType
import json
import os

def convert_models_to_onnx():
    """Convert LightGBM models to ONNX format"""
    
    # Source directory with trained models
    source_dir = "../transit_time_cost"
    output_dir = "models"
    
    # Create models directory
    os.makedirs(output_dir, exist_ok=True)
    
    # Load feature columns
    time_features = load(f"{source_dir}/time_feature_cols.joblib")
    cost_features = load(f"{source_dir}/cost_feature_cols.joblib")
    
    print(f"Time features ({len(time_features)}): {time_features}")
    print(f"Cost features ({len(cost_features)}): {cost_features}")
    
    # Load models
    time_model = lgb.Booster(model_file=f"{source_dir}/lgb_transit_time_model.txt")
    cost_model = lgb.Booster(model_file=f"{source_dir}/lgb_shipping_cost_model.txt")
    
    # Convert to ONNX
    print("Converting transit time model to ONNX...")
    time_onnx = convert_lightgbm(
        time_model,
        initial_types=[('input', FloatTensorType([None, len(time_features)]))],
        target_opset=11
    )
    
    print("Converting shipping cost model to ONNX...")
    cost_onnx = convert_lightgbm(
        cost_model,
        initial_types=[('input', FloatTensorType([None, len(cost_features)]))],
        target_opset=11
    )
    
    # Save ONNX models
    with open(f"{output_dir}/transit_time_model.onnx", "wb") as f:
        f.write(time_onnx.SerializeToString())
    
    with open(f"{output_dir}/shipping_cost_model.onnx", "wb") as f:
        f.write(cost_onnx.SerializeToString())
    
    # Save feature metadata as JSON
    metadata = {
        "time_features": time_features,
        "cost_features": cost_features,
        "zones": ['Zone_1', 'Zone_2', 'Zone_3', 'Zone_4', 'Zone_5', 'Zone_6', 'Zone_7', 'Zone_8', 'Zone_9'],
        "carriers": ['USPS', 'FedEx', 'UPS', 'DHL', 'Amazon_Logistics', 'OnTrac', 'LaserShip', 'Regional_Express'],
        "service_levels": ['STANDARD', 'EXPRESS', 'OVERNIGHT', 'ECONOMY', 'PRIORITY'],
        "model_info": {
            "time_model_performance": {"mae": 0.68, "rmse": 1.53},
            "cost_model_performance": {"mae": 1.38, "rmse": 2.91}
        }
    }
    
    with open(f"{output_dir}/model_metadata.json", "w") as f:
        json.dump(metadata, f, indent=2)
    
    # Load sample historical data for encoding calculations
    historical_data = pd.read_parquet(f"{source_dir}/historical_shipments.parquet")
    
    # Calculate global means for target encoding fallbacks
    global_stats = {
        "global_mean_time": float(historical_data['transit_time_days'].mean()),
        "global_mean_cost": float(historical_data['shipping_cost_usd'].mean()),
        "global_median_time": float(historical_data['transit_time_days'].median()),
        "global_median_cost": float(historical_data['shipping_cost_usd'].median())
    }
    
    with open(f"{output_dir}/global_stats.json", "w") as f:
        json.dump(global_stats, f, indent=2)
    
    # Generate target encoding mappings
    print("Generating target encoding mappings...")
    
    # Create derived features for historical data
    hist_df = historical_data.copy()
    hist_df['route'] = hist_df['origin_zone'].astype(str) + '->' + hist_df['dest_zone'].astype(str)
    hist_df['origin_service'] = hist_df['origin_zone'].astype(str) + '::' + hist_df['service_level'].astype(str)
    hist_df['carrier_service'] = hist_df['carrier'].astype(str) + '::' + hist_df['service_level'].astype(str)
    
    # Calculate target encoding mappings
    encoding_mappings = {}
    
    for col in ['route', 'origin_zone', 'dest_zone', 'carrier', 'service_level', 'origin_service', 'carrier_service']:
        # For time
        time_stats = hist_df.groupby(col)['transit_time_days'].agg(['count', 'mean']).fillna(0)
        time_stats.columns = ['n', 'mean']
        min_samples = 100
        smoothing = 10
        time_stats['smoothing'] = 1 / (1 + np.exp(-(time_stats['n'] - min_samples) / smoothing))
        time_stats['enc'] = global_stats['global_mean_time'] * (1 - time_stats['smoothing']) + time_stats['mean'] * time_stats['smoothing']
        
        # For cost
        cost_stats = hist_df.groupby(col)['shipping_cost_usd'].agg(['count', 'mean']).fillna(0)
        cost_stats.columns = ['n', 'mean']
        cost_stats['smoothing'] = 1 / (1 + np.exp(-(cost_stats['n'] - min_samples) / smoothing))
        cost_stats['enc'] = global_stats['global_mean_cost'] * (1 - cost_stats['smoothing']) + cost_stats['mean'] * cost_stats['smoothing']
        
        encoding_mappings[col] = {
            'time': time_stats['enc'].to_dict(),
            'cost': cost_stats['enc'].to_dict()
        }
    
    with open(f"{output_dir}/target_encodings.json", "w") as f:
        json.dump(encoding_mappings, f, indent=2)
    
    print(f"✅ Models converted successfully!")
    print(f"📁 Output directory: {output_dir}/")
    print(f"📄 Files created:")
    print(f"   - transit_time_model.onnx")
    print(f"   - shipping_cost_model.onnx") 
    print(f"   - model_metadata.json")
    print(f"   - global_stats.json")
    print(f"   - target_encodings.json")

if __name__ == "__main__":
    convert_models_to_onnx()