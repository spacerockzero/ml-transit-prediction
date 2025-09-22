# USPS Zone-Based Transit Time and Shipping Cost Prediction System

This directory contains a complete machine learning system for predicting both shipping transit times and costs based on USPS zones (1-9), package characteristics, and service levels. This system focuses on realistic US domestic shipping scenarios using the actual USPS zone distance system.

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
- **`train.py`** - Training pipeline that builds separate LightGBM models for transit time and shipping cost
- **`generate_synthetic_data.py`** - Creates realistic synthetic shipping data with USPS zones and package characteristics
- **`simple_predict.py`** - Simple function for predicting both transit time and cost
- **`inference.py`** - Full-featured prediction class with uncertainty estimation

### Data Files
- **`historical_shipments.parquet`** - Training data (synthetic, USPS zones, includes package data and costs)
- **`historical_shipments.csv`** - Human-readable version of training data

### Model Files
- **`lgb_transit_time_model.txt`** - Trained LightGBM model for transit time
- **`lgb_shipping_cost_model.txt`** - Trained LightGBM model for shipping cost
- **`lgb_*_quantile_*.txt`** - Quantile models for uncertainty estimation
- **`time_feature_cols.joblib`** - Feature columns for transit time model
- **`cost_feature_cols.joblib`** - Feature columns for cost model

## Quick Start

### 1. Generate Training Data
```bash
python generate_synthetic_data.py
```
This creates `historical_shipments.parquet` with ~29k synthetic US domestic shipping records.

### 2. Train the Models
```bash
python train.py
```
This trains both the transit time and shipping cost models and saves all model files.

### 3. Make Predictions

#### Simple Function (Recommended)
```python
from simple_predict import predict_transit_time_and_cost

# Predict both time and cost for USPS zones
result = predict_transit_time_and_cost(
    ship_date='2024-01-15',
    origin_zone='Zone_1', 
    dest_zone='Zone_5',
    carrier='FedEx',
    service_level='EXPRESS',
    package_weight_lbs=2.5,
    package_length_in=10,
    package_width_in=8,
    package_height_in=6
)

print(f"Transit time: {result['transit_time_days']} days")
print(f"Shipping cost: ${result['shipping_cost_usd']}")
```

## Input Format

All prediction functions expect these inputs:
- **ship_date**: Date string ('2024-01-15') or datetime object
- **origin_zone**: USPS zone (e.g., 'Zone_1', 'Zone_2', ..., 'Zone_9')
- **dest_zone**: USPS zone (e.g., 'Zone_1', 'Zone_2', ..., 'Zone_9')
- **carrier**: Carrier name (e.g., 'USPS', 'FedEx', 'UPS', 'DHL')
- **service_level**: Service type (e.g., 'EXPRESS', 'STANDARD', 'OVERNIGHT', 'ECONOMY', 'PRIORITY')
- **package_weight_lbs**: Package weight in pounds (e.g., 2.5)
- **package_length_in**: Package length in inches (e.g., 10)
- **package_width_in**: Package width in inches (e.g., 8)
- **package_height_in**: Package height in inches (e.g., 6)

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
- **Transit Time MAE**: 0.68 days, RMSE: 1.53 days
- **Shipping Cost MAE**: $1.38, RMSE: $2.91

## Example Predictions

### Realistic USPS Zone Examples
- **Local Priority Package** (Zone 1→1, 1 lb): ~1.7 days, ~$7
- **Medium Distance Express** (Zone 2→6, 3.5 lbs): ~2.9 days, ~$36
- **Cross-country Overnight** (Zone 1→9, 2 lbs): ~2.2 days, ~$79
- **Heavy Economy Package** (Zone 3→7, 15 lbs): ~7.9 days, ~$10
- **Small Standard Package** (Zone 4→5, 0.8 lbs): ~2.9 days, ~$6

## Features Used

Both models use engineered features including:
- Cyclical day-of-week and month encoding
- Package characteristics (weight, dimensions, volume, dimensional weight)
- USPS zone-based route combinations
- Service-level combinations
- Rolling 30-day historical medians per route
- Target-encoded categorical variables optimized for zone distances
- Billable weight calculations (max of actual weight and dimensional weight)

## Cost Calculation Factors

The synthetic cost model incorporates realistic USPS factors:
- **Zone-based pricing** (Zone 1 cheapest, Zone 9 most expensive)
- **Package weight and dimensional weight pricing**
- **Carrier-specific pricing differences**
- **Service level premiums** (Overnight > Express > Priority > Standard > Economy)
- **Fuel surcharges** (varies by month)
- **Realistic weight-distance combinations**

## Package Specifications

- **Weight range**: 0.1 - 70 pounds
- **Dimensions**: Length, width, height in inches
- **Dimensional weight**: Calculated as (L×W×H)/166 for domestic shipping
- **Billable weight**: Maximum of actual weight and dimensional weight

## Dependencies
- pandas
- numpy
- lightgbm
- scikit-learn
- joblib
- pyarrow (for parquet files)

Install with: `uv add pandas numpy lightgbm scikit-learn joblib pyarrow`