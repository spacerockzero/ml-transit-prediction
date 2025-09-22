# USPS Zone-Based Transit Time Prediction System

This directory contains a complete machine learning system for predicting shipping transit times based on USPS zone-based distance calculations. This system uses the real USPS zone system (Zones 1-9) where Zone 1 represents local delivery and Zone 9 represents the furthest distance within the continental US.

## USPS Zone System

The United States Postal Service uses a zone-based system to calculate shipping costs and estimate delivery times:
- **Zone 1**: Local delivery (same ZIP code area)
- **Zone 2**: Regional delivery (nearby areas)  
- **Zone 3-4**: Short to medium distance
- **Zone 5-6**: Medium to long distance
- **Zone 7-8**: Long distance
- **Zone 9**: Cross-country (furthest distance)

## Files Overview

### Core Scripts
- **`train.py`** - Main training pipeline that builds the LightGBM model
- **`generate_synthetic_data.py`** - Creates realistic synthetic shipping data with USPS zones
- **`inference.py`** - Full-featured prediction class with uncertainty estimation
- **`simple_predict.py`** - Simple function for quick predictions

### Data Files
- **`historical_shipments.parquet`** - Training data (synthetic, USPS zone-based)
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
This creates `historical_shipments.parquet` with ~29k synthetic shipping records using USPS zones.

### 2. Train the Model
```bash
python train.py
```
This trains the LightGBM model and saves all model files.

### 3. Make Predictions

#### Simple Function (Recommended for most use cases)
```python
from simple_predict import predict_transit_time

# Local delivery
days = predict_transit_time('2024-01-15', 'Zone_1', 'Zone_1', 'USPS', 'PRIORITY')
print(f"Local delivery: {days} days")

# Cross-country shipping
days = predict_transit_time('2024-01-15', 'Zone_1', 'Zone_9', 'FedEx', 'STANDARD')
print(f"Cross-country: {days} days")
```

#### Full-Featured Class (For advanced use cases)
```python
from inference import TransitTimePredictor

predictor = TransitTimePredictor()

# Single prediction
result = predictor.predict_single('2024-01-15', 'Zone_3', 'Zone_7', 'UPS', 'EXPRESS')

# Prediction with uncertainty
uncertainty = predictor.predict_with_uncertainty('2024-01-15', 'Zone_1', 'Zone_9', 'USPS', 'STANDARD')
print(f"Prediction: {uncertainty['predicted_transit_time']} days")
print(f"10th percentile: {uncertainty['quantiles']['q10']} days")
print(f"90th percentile: {uncertainty['quantiles']['q90']} days")
```

## Input Format

All prediction functions expect these inputs:
- **ship_date**: Date string ('2024-01-15') or datetime object
- **origin_zone**: USPS zone (e.g., 'Zone_1', 'Zone_2', ..., 'Zone_9')
- **dest_zone**: USPS zone (e.g., 'Zone_1', 'Zone_2', ..., 'Zone_9')
- **carrier**: Carrier name (e.g., 'USPS', 'FedEx', 'UPS', 'DHL')
- **service_level**: Service type (e.g., 'EXPRESS', 'STANDARD', 'OVERNIGHT', 'ECONOMY', 'PRIORITY')

## Available USPS Zones
- **Zone_1**: Local delivery (same area)
- **Zone_2**: Regional delivery
- **Zone_3**: Short distance
- **Zone_4**: Short-medium distance
- **Zone_5**: Medium distance
- **Zone_6**: Medium-long distance
- **Zone_7**: Long distance
- **Zone_8**: Very long distance
- **Zone_9**: Cross-country (furthest)

## Available Carriers
USPS, FedEx, UPS, DHL, Amazon_Logistics, OnTrac, LaserShip, Regional_Express

## Available Service Levels
STANDARD, EXPRESS, OVERNIGHT, ECONOMY, PRIORITY

## Model Performance
- **Validation MAE**: 0.66 days
- **Validation RMSE**: 1.39 days

## Realistic Transit Time Examples
- **Local (Zone 1→1)**: 1-3 days
- **Regional (Zone 1→3)**: 1-2 days
- **Medium (Zone 2→6)**: 4-7 days  
- **Cross-country (Zone 1→9)**: 7-10 days

## Features Used
The model uses these engineered features:
- Cyclical day-of-week and month encoding
- USPS zone-based route combinations
- Service-level combinations
- Rolling 30-day historical median per route
- Target-encoded categorical variables optimized for zone distances

## Dependencies
The system requires:
- pandas
- numpy
- lightgbm
- scikit-learn
- joblib
- pyarrow (for parquet files)

Install with: `uv add pandas numpy lightgbm scikit-learn joblib pyarrow`