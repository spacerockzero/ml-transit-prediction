# Transit Time Prediction System

This directory contains a complete machine learning system for predicting shipping transit times based on historical data.

## Files Overview

### Core Scripts
- **`train.py`** - Main training pipeline that builds the LightGBM model
- **`generate_synthetic_data.py`** - Creates realistic synthetic shipping data for testing
- **`inference.py`** - Full-featured prediction class with uncertainty estimation
- **`simple_predict.py`** - Simple function for quick predictions

### Data Files
- **`historical_shipments.parquet`** - Training data (synthetic)
- **`historical_shipments.csv`** - Human-readable version of training data

### Model Files
- **`lgb_transit_model.txt`** - Trained LightGBM regression model
- **`lgb_transit_quantile_*.txt`** - Quantile models for uncertainty estimation (10th, 50th, 90th percentiles)
- **`feature_cols.joblib`** - Saved feature column names

## Quick Start

### 1. Generate Training Data
```bash
python generate_synthetic_data.py
```
This creates `historical_shipments.parquet` with ~29k synthetic shipping records.

### 2. Train the Model
```bash
python train.py
```
This trains the LightGBM model and saves all model files.

### 3. Make Predictions

#### Simple Function (Recommended for most use cases)
```python
from simple_predict import predict_transit_time

# Single prediction
days = predict_transit_time('2024-01-15', 'US_WEST', 'US_EAST', 'FedEx', 'EXPRESS')
print(f"Expected transit time: {days} days")
```

#### Full-Featured Class (For advanced use cases)
```python
from inference import TransitTimePredictor

predictor = TransitTimePredictor()

# Single prediction
result = predictor.predict_single('2024-01-15', 'US_WEST', 'US_EAST', 'FedEx', 'EXPRESS')

# Batch predictions
import pandas as pd
df = pd.DataFrame({
    'ship_date': ['2024-01-15', '2024-01-16'],
    'origin_zone': ['US_WEST', 'EU_WEST'],
    'dest_zone': ['US_EAST', 'ASIA_EAST'],
    'carrier': ['FedEx', 'DHL'],
    'service_level': ['EXPRESS', 'STANDARD']
})
predictions = predictor.predict_batch(df)

# Prediction with uncertainty
uncertainty = predictor.predict_with_uncertainty('2024-01-15', 'US_WEST', 'ASIA_EAST', 'DHL', 'STANDARD')
print(f"Prediction: {uncertainty['predicted_transit_time']} days")
print(f"10th percentile: {uncertainty['quantiles']['q10']} days")
print(f"90th percentile: {uncertainty['quantiles']['q90']} days")
```

## Input Format

All prediction functions expect these inputs:
- **ship_date**: Date string ('2024-01-15') or datetime object
- **origin_zone**: Origin zone code (e.g., 'US_WEST', 'EU_WEST', 'ASIA_EAST')
- **dest_zone**: Destination zone code (e.g., 'US_EAST', 'EU_EAST', 'ASIA_WEST')
- **carrier**: Carrier name (e.g., 'FedEx', 'UPS', 'DHL', 'USPS')
- **service_level**: Service type (e.g., 'EXPRESS', 'STANDARD', 'OVERNIGHT', 'ECONOMY', 'PRIORITY')

## Available Zones
- **US Regions**: US_EAST, US_WEST, US_CENTRAL, US_SOUTH
- **EU Regions**: EU_WEST, EU_EAST, EU_NORTH, EU_SOUTH
- **Asia**: ASIA_EAST, ASIA_SOUTH, ASIA_WEST
- **Canada**: CANADA_EAST, CANADA_WEST
- **Latin America**: LATAM_NORTH, LATAM_SOUTH
- **Other**: OCEANIA, AFRICA_NORTH, AFRICA_SOUTH

## Available Carriers
FedEx, UPS, DHL, TNT, USPS, Amazon_Logistics, OnTrac, LaserShip, Regional_Express, Global_Freight

## Available Service Levels
STANDARD, EXPRESS, OVERNIGHT, ECONOMY, PRIORITY

## Model Performance
- **Validation MAE**: 0.69 days
- **Validation RMSE**: 1.47 days

## Features Used
The model uses these engineered features:
- Cyclical day-of-week and month encoding
- Route combinations (origin->destination)
- Service-level combinations
- Rolling 30-day historical median per route
- Target-encoded categorical variables

## Dependencies
The system requires:
- pandas
- numpy
- lightgbm
- scikit-learn
- joblib
- pyarrow (for parquet files)

Install with: `uv add pandas numpy lightgbm scikit-learn joblib pyarrow`