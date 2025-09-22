import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import random

# Set random seed for reproducibility
np.random.seed(42)
random.seed(42)

def zip_to_zone(zip_code):
    """Convert ZIP code to USPS zone based on official zone chart"""
    zip_int = int(str(zip_code)[:3])  # Use first 3 digits
    
    # ZIP code to zone mapping based on USPS zone chart
    zip_zones = {
        # Zone 8
        (5, 139): 8, (170, 176): 8, (178, 212): 8, (214, 214): 8, (216, 225): 8,
        (230, 238): 8, (278, 279): 8, (283, 285): 8, (294, 294): 8, (320, 322): 8,
        (327, 342): 8, (346, 347): 8, (349, 349): 8, (967, 969): 8, (995, 997): 8,
        
        # Zone 7
        (140, 169): 7, (177, 177): 7, (215, 215): 7, (226, 229): 7, (239, 268): 7,
        (270, 277): 7, (280, 282): 7, (286, 293): 7, (295, 319): 7, (323, 326): 7,
        (344, 344): 7, (350, 352): 7, (355, 368): 7, (373, 374): 7, (376, 379): 7,
        (385, 385): 7, (395, 395): 7, (398, 399): 7, (403, 418): 7, (425, 426): 7,
        (427, 427): 7, (430, 459): 7, (470, 470): 7, (480, 487): 7, (492, 492): 7,
        (700, 701): 7, (998, 998): 7,
        
        # Zone 6
        (354, 354): 6, (369, 372): 6, (375, 375): 6, (380, 384): 6, (386, 394): 6,
        (396, 397): 6, (400, 402): 6, (420, 424): 6, (427, 427): 6, (460, 469): 6,
        (471, 479): 6, (488, 491): 6, (493, 499): 6, (520, 524): 6, (526, 528): 6,
        (530, 532): 6, (534, 535): 6, (537, 539): 6, (541, 549): 6, (556, 559): 6,
        (600, 620): 6, (622, 631): 6, (633, 639): 6, (648, 648): 6, (650, 658): 6,
        (703, 708): 6, (710, 714): 6, (716, 726): 6, (728, 729): 6, (733, 733): 6,
        (749, 749): 6, (755, 759): 6, (770, 789): 6, (999, 999): 6,
        
        # Zone 5
        (500, 516): 5, (525, 525): 5, (540, 540): 5, (550, 551): 5, (553, 555): 5,
        (560, 567): 5, (570, 576): 5, (640, 641): 5, (644, 647): 5, (649, 649): 5,
        (660, 662): 5, (664, 676): 5, (678, 681): 5, (683, 689): 5, (727, 727): 5,
        (730, 731): 5, (734, 741): 5, (743, 748): 5, (750, 754): 5, (760, 769): 5,
        (790, 799): 5, (880, 882): 5, (885, 885): 5, (919, 921): 5, (931, 931): 5,
        (934, 934): 5, (949, 949): 5, (954, 955): 5, (970, 974): 5, (980, 986): 5,
        
        # Zone 4
        (577, 577): 4, (590, 599): 4, (677, 677): 4, (690, 693): 4, (800, 813): 4,
        (820, 822): 4, (827, 828): 4, (835, 835): 4, (838, 838): 4, (850, 850): 4,
        (852, 853): 4, (855, 857): 4, (859, 860): 4, (863, 865): 4, (870, 875): 4,
        (877, 879): 4, (883, 884): 4, (889, 891): 4, (894, 895): 4, (897, 897): 4,
        (900, 908): 4, (910, 918): 4, (922, 928): 4, (930, 930): 4, (932, 933): 4,
        (935, 948): 4, (950, 953): 4, (956, 966): 4, (975, 978): 4, (988, 994): 4,
        
        # Zone 3
        (814, 816): 3, (823, 826): 3, (833, 833): 3, (836, 837): 3, (893, 893): 3,
        (898, 898): 3, (979, 979): 3,
        
        # Zone 2
        (829, 832): 2, (834, 834): 2, (840, 847): 2
    }
    
    # Find the zone for the given ZIP code
    for (start, end), zone in zip_zones.items():
        if start <= zip_int <= end:
            return zone
    
    # Default to zone 5 if not found (middle zone)
    return 5

def generate_realistic_zip_codes():
    """Generate realistic ZIP codes with proper distribution"""
    # Common ZIP code prefixes with weights (more populated areas)
    zip_prefixes = {
        # High population areas (more frequent)
        900: 15,  # CA
        100: 12,  # NY
        200: 10,  # DC/VA
        300: 8,   # PA
        600: 8,   # IL
        700: 7,   # TX
        800: 6,   # CO
        400: 6,   # KY/IN
        
        # Medium population
        500: 5,   # IA
        550: 4,   # MN
        480: 4,   # AZ
        330: 4,   # OH
        
        # Lower population but still common
        830: 3,   # TX
        970: 2,   # CO
        990: 2,   # AK
        140: 2,   # NY
        50: 1,    # VT (fixed: was 050)
    }
    
    # Create weighted list
    zip_list = []
    for prefix, weight in zip_prefixes.items():
        zip_list.extend([prefix] * weight)
    
    # Generate full ZIP code
    prefix = np.random.choice(zip_list)
    suffix = np.random.randint(10, 99)  # Last 2 digits
    
    return f"{prefix:03d}{suffix:02d}"

# Define realistic shipping data parameters
# Use actual ZIP codes instead of abstract zones
def get_sample_zip_codes():
    """Get a sample of ZIP codes representing different zones"""
    return [
        '10001',  # NYC - Zone 7
        '90210',  # CA - Zone 4 
        '60601',  # Chicago - Zone 6
        '30301',  # Atlanta - Zone 6
        '75201',  # Dallas - Zone 5
        '80202',  # Denver - Zone 4
        '98101',  # Seattle - Zone 4
        '33101',  # Miami - Zone 7
        '85001',  # Phoenix - Zone 4
        '97201',  # Portland - Zone 4
        '50301',  # Des Moines - Zone 5
        '55401',  # Minneapolis - Zone 5
    ]

carriers = [
    'USPS', 'FedEx', 'UPS', 'DHL', 'Amazon_Logistics', 
    'OnTrac', 'LaserShip', 'Regional_Express'
]

service_levels = [
    'Ground', 'Express', 'Priority', 'Overnight'
]

# Define base transit times (in days) for different service levels and USPS zones
base_transit_times = {
    'Overnight': {1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 2},
    'Express': {1: 2, 2: 2, 3: 2, 4: 2, 5: 3, 6: 3, 7: 3, 8: 3, 9: 3},
    'Priority': {1: 2, 2: 3, 3: 3, 4: 3, 5: 3, 6: 4, 7: 4, 8: 4, 9: 4},
    'Ground': {1: 3, 2: 4, 3: 4, 4: 5, 5: 5, 6: 6, 7: 6, 8: 7, 9: 8}
}

# Define base shipping costs (in USD) based on real carrier pricing data
# Prices adjusted for different zones (higher zones = longer distance = higher cost)
base_shipping_costs = {
    'Overnight': {1: 65.00, 2: 70.00, 3: 75.00, 4: 85.00, 5: 95.00, 6: 110.00, 7: 125.00, 8: 145.00, 9: 165.00},
    'Express': {1: 22.00, 2: 25.00, 3: 28.00, 4: 32.00, 5: 36.00, 6: 42.00, 7: 48.00, 8: 55.00, 9: 65.00},
    'Priority': {1: 14.00, 2: 16.00, 3: 18.00, 4: 20.00, 5: 23.00, 6: 26.00, 7: 30.00, 8: 35.00, 9: 40.00},
    'Ground': {1: 10.50, 2: 12.00, 3: 13.50, 4: 15.50, 5: 18.00, 6: 21.00, 7: 24.00, 8: 28.00, 9: 32.00}
}

def get_zone_distance(origin_zip, dest_zip):
    """Calculate zone distance based on USPS zones from ZIP codes"""
    origin_zone = zip_to_zone(origin_zip)
    dest_zone = zip_to_zone(dest_zip)
    # Distance is the difference between zones
    return abs(origin_zone - dest_zone)

def calculate_realistic_transit_time_and_cost(origin_zip, dest_zip, service_level, ship_date, package_weight, package_dimensions):
    """Calculate realistic transit time and shipping cost with various factors"""
    zone_distance = get_zone_distance(origin_zip, dest_zip)
    
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
    
    # Carrier pricing (based on real market positioning)
    carrier_effect_cost = {
        'USPS': 0.85,  # Competitive government pricing
        'FedEx': 1.25,  # Premium positioning (Ground $26 vs USPS $11)
        'UPS': 1.05,   # Mid-range competitive
        'DHL': 1.30,   # Premium international focus
        'Amazon_Logistics': 0.90,  # Competitive tech company
        'OnTrac': 0.95,   # Regional competitive
        'LaserShip': 0.92,  # Regional value
        'Regional_Express': 0.88   # Local/regional budget
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
        # Generate realistic origin and destination ZIP codes
        origin_zip = generate_realistic_zip_codes()
        dest_zip = generate_realistic_zip_codes()
        
        # Ensure origin and destination are different
        while origin_zip == dest_zip:
            dest_zip = generate_realistic_zip_codes()
        
        # Select service level with realistic distribution
        service_level = np.random.choice(
            service_levels, 
            p=[0.45, 0.25, 0.20, 0.10]  # Ground most common, Overnight least
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
            origin_zip, dest_zip, service_level, date, package_weight, package_dimensions
        )
        
        # Create record
        record = {
            'shipment_id': f'SHIP_{record_id:08d}',
            'ship_date': date,
            'origin_zip': origin_zip,
            'dest_zip': dest_zip,
            'origin_zone': zip_to_zone(origin_zip),
            'dest_zone': zip_to_zone(dest_zip),
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
print(f"Unique origin ZIP codes: {df['origin_zip'].nunique()}")
print(f"Unique destination ZIP codes: {df['dest_zip'].nunique()}")
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

print("\nTop 10 ZIP to ZIP routes:")
df['route'] = df['origin_zip'] + '->' + df['dest_zip']
print(df['route'].value_counts().head(10))

print("\nTop 10 zone to zone routes:")
df['zone_route'] = df['origin_zone'].astype(str) + '->' + df['dest_zone'].astype(str)
print(df['zone_route'].value_counts().head(10))

# Save as parquet file
output_file = "output/historical_shipments.parquet"
df.drop(['shipment_id', 'route', 'zone_route'], axis=1).to_parquet(output_file, index=False)
print(f"\nUSPS zone synthetic data with ZIP codes and cost information saved as '{output_file}'")  

# Also save as CSV for easy inspection
df.drop(['shipment_id', 'route', 'zone_route'], axis=1).to_csv("output/historical_shipments.csv", index=False)
print(f"Also saved as 'output/historical_shipments.csv' for inspection")
print("\nFirst 10 records:")
print(df.drop(['shipment_id', 'route', 'zone_route'], axis=1).head(10))