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

def get_zone_distance(origin, dest):
    """Calculate zone distance based on USPS zone numbers"""
    origin_zone = int(origin.split('_')[1])
    dest_zone = int(dest.split('_')[1])
    # Distance is the difference between zones
    return abs(origin_zone - dest_zone)

def calculate_realistic_transit_time(origin, dest, service_level, ship_date):
    """Calculate realistic transit time with various factors"""
    zone_distance = get_zone_distance(origin, dest)
    
    # Map zone distance to actual zone for lookup (higher zones = longer distance)
    actual_zone = min(9, max(1, zone_distance + 1))  # Ensure zone is 1-9
    base_time = base_transit_times[service_level][actual_zone]
    
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
        'USPS': 0, 'FedEx': -0.5, 'UPS': -0.3, 'DHL': 0.2,
        'Amazon_Logistics': -0.2, 'OnTrac': 0.3, 'LaserShip': 0.4, 
        'Regional_Express': 0.6
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
        
        # Calculate transit time and select carrier
        transit_time, carrier = calculate_realistic_transit_time(
            origin, dest, service_level, date
        )
        
        # Create record
        record = {
            'shipment_id': f'SHIP_{record_id:08d}',
            'ship_date': date,
            'origin_zone': origin,
            'dest_zone': dest,
            'carrier': carrier,
            'service_level': service_level,
            'transit_time_days': transit_time
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

print("\nTransit time statistics:")
print(df['transit_time_days'].describe())

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
print(f"\nUSPS zone synthetic data saved as '{output_file}'")

# Also save as CSV for easy inspection
df.drop(['shipment_id', 'route'], axis=1).to_csv("historical_shipments.csv", index=False)
print(f"Also saved as 'historical_shipments.csv' for inspection")

print("\nFirst 10 records:")
print(df.drop(['shipment_id', 'route'], axis=1).head(10))