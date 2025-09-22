import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import random

# Set random seed for reproducibility
np.random.seed(42)
random.seed(42)

# Define realistic shipping data parameters
# USPS zones 1-9 representing distance bands (1=local, 9=furthest)
zones = ['Zone_1', 'Zone_2', 'Zone_3', 'Zone_4', 'Zone_5', 'Zone_6', 'Zone_7', 'Zone_8', 'Zone_9']

carriers = [
    'USPS', 'FedEx', 'UPS', 'DHL', 'Amazon_Logistics', 
    'OnTrac', 'LaserShip', 'Regional_Express'
]

service_levels = [
    'STANDARD', 'EXPRESS', 'OVERNIGHT', 'ECONOMY', 'PRIORITY'
]

# Define base transit times (in days) for different service levels and USPS zones
base_transit_times = {
    'OVERNIGHT': {1: 1, 2: 1, 3: 1, 4: 2, 5: 2, 6: 2, 7: 3, 8: 3, 9: 3},
    'EXPRESS': {1: 1, 2: 2, 3: 2, 4: 3, 5: 3, 6: 4, 7: 4, 8: 5, 9: 5},
    'PRIORITY': {1: 2, 2: 2, 3: 3, 4: 3, 5: 4, 6: 4, 7: 5, 8: 5, 9: 6},
    'STANDARD': {1: 2, 2: 3, 3: 4, 4: 5, 5: 6, 6: 7, 7: 8, 8: 9, 9: 10},
    'ECONOMY': {1: 3, 2: 4, 3: 5, 4: 6, 5: 7, 6: 8, 7: 9, 8: 10, 9: 12}
}

# Define base shipping costs (in USD) for different service levels and USPS zones
base_shipping_costs = {
    'OVERNIGHT': {1: 15.00, 2: 18.00, 3: 22.00, 4: 28.00, 5: 35.00, 6: 45.00, 7: 55.00, 8: 65.00, 9: 75.00},
    'EXPRESS': {1: 10.00, 2: 12.00, 3: 15.00, 4: 18.00, 5: 22.00, 6: 28.00, 7: 35.00, 8: 42.00, 9: 50.00},
    'PRIORITY': {1: 8.00, 2: 9.50, 3: 11.00, 4: 13.00, 5: 16.00, 6: 20.00, 7: 25.00, 8: 30.00, 9: 35.00},
    'STANDARD': {1: 5.50, 2: 6.50, 3: 7.50, 4: 8.50, 5: 10.00, 6: 12.00, 7: 15.00, 8: 18.00, 9: 22.00},
    'ECONOMY': {1: 4.00, 2: 4.50, 3: 5.00, 4: 5.50, 5: 6.50, 6: 8.00, 7: 10.00, 8: 12.00, 9: 15.00}
}

def get_zone_distance(origin, dest):
    """Calculate zone distance based on USPS zone numbers"""
    origin_zone = int(origin.split('_')[1])
    dest_zone = int(dest.split('_')[1])
    # Distance is the difference between zones
    return abs(origin_zone - dest_zone)

def calculate_realistic_transit_time_and_cost(origin, dest, service_level, ship_date, package_weight, package_dimensions):
    """Calculate realistic transit time and shipping cost with various factors"""
    zone_distance = get_zone_distance(origin, dest)
    
    # Map zone distance to actual zone for lookup (higher zones = longer distance)
    actual_zone = min(9, max(1, zone_distance + 1))  # Ensure zone is 1-9
    base_time = base_transit_times[service_level][actual_zone]
    base_cost = base_shipping_costs[service_level][actual_zone]
    
    # Add variability factors for transit time
    # Weekend effect (shipments on Friday/Saturday may take longer)
    weekend_delay = 0
    if ship_date.weekday() >= 4:  # Friday or Saturday
        weekend_delay = np.random.choice([0, 1, 2], p=[0.6, 0.3, 0.1])
    
    # Holiday season effect (December)
    holiday_delay = 0
    if ship_date.month == 12:
        holiday_delay = np.random.choice([0, 1, 2, 3], p=[0.4, 0.3, 0.2, 0.1])
    
    # Carrier efficiency (some carriers are consistently faster/slower)
    carrier_effect_time = {
        'USPS': 0, 'FedEx': -0.5, 'UPS': -0.3, 'DHL': 0.2,
        'Amazon_Logistics': -0.2, 'OnTrac': 0.3, 'LaserShip': 0.4, 
        'Regional_Express': 0.6
    }
    
    # Carrier pricing (some carriers are more/less expensive)
    carrier_effect_cost = {
        'USPS': 0.8, 'FedEx': 1.2, 'UPS': 1.1, 'DHL': 1.3,
        'Amazon_Logistics': 0.9, 'OnTrac': 0.85, 'LaserShip': 0.9, 
        'Regional_Express': 0.75
    }
    
    # Random variability
    random_factor_time = np.random.normal(0, 0.5)
    random_factor_cost = np.random.normal(1, 0.1)  # Multiplicative for cost
    
    # Calculate final transit time
    carrier = np.random.choice(carriers)
    transit_time = base_time + weekend_delay + holiday_delay + random_factor_time
    transit_time += carrier_effect_time.get(carrier, 0)
    
    # Ensure minimum of 1 day and reasonable maximum
    transit_time = max(1, min(transit_time, 30))
    
    # Calculate shipping cost based on weight and dimensions
    # Base cost adjustment for package characteristics
    weight_multiplier = 1 + (package_weight - 1) * 0.1  # $0.10 per additional lb
    
    # Dimensional weight calculation (length * width * height / 166 for domestic)
    dim_weight = (package_dimensions[0] * package_dimensions[1] * package_dimensions[2]) / 166
    billable_weight = max(package_weight, dim_weight)
    weight_cost_factor = 1 + (billable_weight - 1) * 0.08
    
    # Calculate final cost
    shipping_cost = base_cost * carrier_effect_cost.get(carrier, 1.0) * weight_cost_factor * random_factor_cost
    
    # Add fuel surcharge (varies by month)
    fuel_surcharge = 1 + (ship_date.month % 12) * 0.005  # 0-5.5% based on month
    shipping_cost *= fuel_surcharge
    
    # Round to realistic values
    shipping_cost = max(3.00, round(shipping_cost, 2))  # Minimum $3.00
    
    return round(transit_time, 1), round(shipping_cost, 2), carrier
    
    # Add variability factors
    # Weekend effect (shipments on Friday/Saturday may take longer)
    weekend_delay = 0
    if ship_date.weekday() >= 4:  # Friday or Saturday
        weekend_delay = np.random.choice([0, 1, 2], p=[0.6, 0.3, 0.1])
    
    # Holiday season effect (December)
    holiday_delay = 0
    if ship_date.month == 12:
        holiday_delay = np.random.choice([0, 1, 2, 3], p=[0.4, 0.3, 0.2, 0.1])
    
    # Carrier efficiency (some carriers are consistently faster/slower)
    carrier_effect = {
        'FedEx': -0.5, 'UPS': -0.3, 'DHL': 0, 'TNT': 0.2,
        'USPS': 0.5, 'Amazon_Logistics': -0.2, 'OnTrac': 0.3,
        'LaserShip': 0.4, 'Regional_Express': 0.6, 'Global_Freight': 1.0
    }
    
    # Random variability
    random_factor = np.random.normal(0, 0.5)
    
    # Calculate final transit time
    transit_time = base_time + weekend_delay + holiday_delay + random_factor
    
    # Apply carrier effect
    carrier = np.random.choice(carriers)
    transit_time += carrier_effect.get(carrier, 0)
    
    # Ensure minimum of 1 day and reasonable maximum
    transit_time = max(1, min(transit_time, 30))
    
    return round(transit_time, 1), carrier

# Generate date range (2 years of data)
start_date = datetime(2023, 1, 1)
end_date = datetime(2024, 12, 31)
date_range = pd.date_range(start=start_date, end=end_date, freq='D')

# Generate synthetic shipping data
print("Generating synthetic shipping data...")
data = []
record_id = 1

# Generate varying number of shipments per day (more on weekdays)
for date in date_range:
    # Determine number of shipments for this day
    if date.weekday() < 5:  # Weekday
        daily_shipments = np.random.poisson(50)  # Average 50 shipments per weekday
    else:  # Weekend
        daily_shipments = np.random.poisson(15)  # Average 15 shipments per weekend day
    
    for _ in range(daily_shipments):
        # Select random origin and destination zones
        # Weight selection to favor more realistic zone combinations
        # (more shipments between nearby zones)
        origin = np.random.choice(zones)
        
        # Select destination with some preference for nearby zones
        origin_num = int(origin.split('_')[1])
        zone_weights = []
        for zone in zones:
            dest_num = int(zone.split('_')[1])
            distance = abs(origin_num - dest_num)
            # Closer zones get higher weight (more common shipments)
            weight = max(0.1, 1.0 - distance * 0.1)
            zone_weights.append(weight)
        
        # Normalize weights
        zone_weights = np.array(zone_weights)
        zone_weights = zone_weights / zone_weights.sum()
        dest = np.random.choice(zones, p=zone_weights)
        
        # Select service level with realistic distribution
        service_level = np.random.choice(
            service_levels, 
            p=[0.4, 0.25, 0.1, 0.15, 0.1]  # STANDARD is most common
        )
        
        # Generate package characteristics
        # Weight in pounds (log-normal distribution, most packages are light)
        package_weight = max(0.1, np.random.lognormal(mean=0.5, sigma=1.0))
        package_weight = min(package_weight, 70)  # Cap at 70 lbs
        
        # Package dimensions in inches (length, width, height)
        # Generate correlated dimensions based on weight
        base_size = 6 + package_weight * 0.3  # Heavier packages tend to be larger
        length = max(4, np.random.normal(base_size, base_size * 0.3))
        width = max(3, np.random.normal(base_size * 0.8, base_size * 0.2))
        height = max(2, np.random.normal(base_size * 0.6, base_size * 0.25))
        package_dimensions = [length, width, height]
        
        # Calculate transit time, cost, and select carrier
        transit_time, shipping_cost, carrier = calculate_realistic_transit_time_and_cost(
            origin, dest, service_level, date, package_weight, package_dimensions
        )
        
        # Create record
        record = {
            'shipment_id': f'SHIP_{record_id:08d}',
            'ship_date': date,
            'origin_zone': origin,
            'dest_zone': dest,
            'carrier': carrier,
            'service_level': service_level,
            'package_weight_lbs': round(package_weight, 2),
            'package_length_in': round(package_dimensions[0], 1),
            'package_width_in': round(package_dimensions[1], 1),
            'package_height_in': round(package_dimensions[2], 1),
            'transit_time_days': transit_time,
            'shipping_cost_usd': shipping_cost
        }
        
        data.append(record)
        record_id += 1

# Convert to DataFrame
df = pd.DataFrame(data)

# Add some realistic data quality issues (small percentage)
print(f"Generated {len(df)} shipping records")

# Introduce some missing values (realistic for real-world data)
missing_indices = np.random.choice(df.index, size=int(len(df) * 0.02), replace=False)
df.loc[missing_indices, 'transit_time_days'] = np.nan

# Some missing cost data too (less common)
cost_missing_indices = np.random.choice(df.index, size=int(len(df) * 0.01), replace=False)
df.loc[cost_missing_indices, 'shipping_cost_usd'] = np.nan

# Add a few outliers (delayed shipments)
outlier_indices = np.random.choice(df.index, size=int(len(df) * 0.005), replace=False)
df.loc[outlier_indices, 'transit_time_days'] = df.loc[outlier_indices, 'transit_time_days'] + np.random.uniform(10, 25, len(outlier_indices))

# Display summary statistics
print("\nDataset Summary:")
print(f"Total records: {len(df)}")
print(f"Date range: {df['ship_date'].min()} to {df['ship_date'].max()}")
print(f"Unique origin zones: {df['origin_zone'].nunique()}")
print(f"Unique destination zones: {df['dest_zone'].nunique()}")
print(f"Unique carriers: {df['carrier'].nunique()}")
print(f"Unique service levels: {df['service_level'].nunique()}")
print(f"Missing transit times: {df['transit_time_days'].isna().sum()}")
print(f"Missing shipping costs: {df['shipping_cost_usd'].isna().sum()}")

print("\nTransit time statistics:")
print(df['transit_time_days'].describe())

print("\nShipping cost statistics:")
print(df['shipping_cost_usd'].describe())

print("\nPackage weight statistics:")
print(df['package_weight_lbs'].describe())

print("\nService level distribution:")
print(df['service_level'].value_counts())

print("\nZone distribution (origin):")
print(df['origin_zone'].value_counts().sort_index())

print("\nTop 10 routes:")
df['route'] = df['origin_zone'] + '->' + df['dest_zone']
print(df['route'].value_counts().head(10))

# Save as parquet file
output_file = "historical_shipments.parquet"
df.drop(['shipment_id', 'route'], axis=1).to_parquet(output_file, index=False)
print(f"\nUSPS zone synthetic data with cost information saved as '{output_file}'")

# Also save as CSV for easy inspection
df.drop(['shipment_id', 'route'], axis=1).to_csv("historical_shipments.csv", index=False)
print(f"Also saved as 'historical_shipments.csv' for inspection")

print("\nFirst 10 records:")
print(df.drop(['shipment_id', 'route'], axis=1).head(10))