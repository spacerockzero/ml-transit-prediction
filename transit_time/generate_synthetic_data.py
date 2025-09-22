import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import random

# Set random seed for reproducibility
np.random.seed(42)
random.seed(42)

# Define realistic shipping data parameters
zones = [
    'US_EAST', 'US_WEST', 'US_CENTRAL', 'US_SOUTH',
    'EU_WEST', 'EU_EAST', 'EU_NORTH', 'EU_SOUTH',
    'ASIA_EAST', 'ASIA_SOUTH', 'ASIA_WEST',
    'CANADA_EAST', 'CANADA_WEST',
    'LATAM_NORTH', 'LATAM_SOUTH',
    'OCEANIA', 'AFRICA_NORTH', 'AFRICA_SOUTH'
]

carriers = [
    'FedEx', 'UPS', 'DHL', 'TNT', 'USPS',
    'Amazon_Logistics', 'OnTrac', 'LaserShip',
    'Regional_Express', 'Global_Freight'
]

service_levels = [
    'Ground', 'Express', 'Priority', 'Overnight'
]

# Define base transit times (in days) for different service levels and distance categories
base_transit_times = {
    'Overnight': {'domestic': 1, 'regional': 2, 'international': 3},
    'Express': {'domestic': 2, 'regional': 3, 'international': 5},
    'Priority': {'domestic': 3, 'regional': 4, 'international': 7},
    'Ground': {'domestic': 5, 'regional': 7, 'international': 12}
}

def get_distance_category(origin, dest):
    """Categorize route distance based on zone codes"""
    origin_region = origin.split('_')[0]
    dest_region = dest.split('_')[0]
    
    if origin_region == dest_region:
        return 'domestic'
    elif (origin_region in ['US', 'CANADA'] and dest_region in ['US', 'CANADA']) or \
         (origin_region == 'EU' and dest_region == 'EU'):
        return 'regional'
    else:
        return 'international'

def calculate_realistic_transit_time(origin, dest, service_level, ship_date):
    """Calculate realistic transit time with various factors"""
    distance_cat = get_distance_category(origin, dest)
    base_time = base_transit_times[service_level][distance_cat]
    
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
        'FedEx': -0.5, 'UPS': -0.3, 'DHL': 0, 'USPS': 0.2,
        'Amazon_Logistics': -0.2, 'OnTrac': 0.3, 'LaserShip': 0.4, 
        'Regional_Express': 0.6, 'Global_Freight': 1.0
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
        # Select random origin and destination (ensure they're different)
        origin = np.random.choice(zones)
        dest = np.random.choice([z for z in zones if z != origin])
        
        # Select service level with realistic distribution
        service_level = np.random.choice(
            service_levels, 
            p=[0.45, 0.25, 0.20, 0.10]  # Ground most common, Overnight least
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
print(f"Unique origins: {df['origin_zone'].nunique()}")
print(f"Unique destinations: {df['dest_zone'].nunique()}")
print(f"Unique carriers: {df['carrier'].nunique()}")
print(f"Unique service levels: {df['service_level'].nunique()}")
print(f"Missing transit times: {df['transit_time_days'].isna().sum()}")

print("\nTransit time statistics:")
print(df['transit_time_days'].describe())

print("\nService level distribution:")
print(df['service_level'].value_counts())

print("\nTop 10 routes:")
df['route'] = df['origin_zone'] + '->' + df['dest_zone']
print(df['route'].value_counts().head(10))

# Save as parquet file
output_file = "historical_shipments.parquet"
df.drop(['shipment_id', 'route'], axis=1).to_parquet(output_file, index=False)
print(f"\nSynthetic data saved as '{output_file}'")

# Also save as CSV for easy inspection
df.drop(['shipment_id', 'route'], axis=1).to_csv("historical_shipments.csv", index=False)
print(f"Also saved as 'historical_shipments.csv' for inspection")

print("\nFirst 10 records:")
print(df.drop(['shipment_id', 'route'], axis=1).head(10))