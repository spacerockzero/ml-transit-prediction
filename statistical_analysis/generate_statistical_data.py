#!/usr/bin/env python3
"""
Enhanced synthetic shipping data generator for statistical analysis.
Creates realistic datasets with proper normal distributions for transit times and costs.
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import random
import json
from pathlib import Path

# Set random seed for reproducibility
np.random.seed(42)
random.seed(42)

# Define comprehensive shipping parameters
CARRIERS = ["USPS", "FedEx", "UPS", "DHL", "Amazon_Logistics", "OnTrac", "LaserShip"]
SERVICE_LEVELS = ["OVERNIGHT", "EXPRESS", "PRIORITY", "STANDARD", "ECONOMY"]
USPS_ZONES = list(range(1, 10))  # Zones 1-9

# Define realistic base parameters with proper statistical properties
SERVICE_LEVEL_SPECS = {
    "OVERNIGHT": {
        "base_time": 1.2,
        "time_std": 0.3,
        "base_cost": 25.0,
        "cost_std": 3.0,
        "zone_factor": 0.1,
    },
    "EXPRESS": {
        "base_time": 2.1,
        "time_std": 0.5,
        "base_cost": 18.0,
        "cost_std": 2.5,
        "zone_factor": 0.15,
    },
    "PRIORITY": {
        "base_time": 3.2,
        "time_std": 0.8,
        "base_cost": 12.0,
        "cost_std": 2.0,
        "zone_factor": 0.2,
    },
    "STANDARD": {
        "base_time": 5.5,
        "time_std": 1.2,
        "base_cost": 8.0,
        "cost_std": 1.5,
        "zone_factor": 0.3,
    },
    "ECONOMY": {
        "base_time": 8.0,
        "time_std": 2.0,
        "base_cost": 4.5,
        "cost_std": 1.0,
        "zone_factor": 0.4,
    },
}

# Carrier-specific adjustments (multipliers)
CARRIER_ADJUSTMENTS = {
    "USPS": {"time_mult": 1.0, "cost_mult": 0.85},
    "FedEx": {"time_mult": 0.9, "cost_mult": 1.15},
    "UPS": {"time_mult": 0.95, "cost_mult": 1.1},
    "DHL": {"time_mult": 1.1, "cost_mult": 1.3},
    "Amazon_Logistics": {"time_mult": 1.05, "cost_mult": 0.9},
    "OnTrac": {"time_mult": 1.15, "cost_mult": 0.95},
    "LaserShip": {"time_mult": 1.2, "cost_mult": 0.8},
}


def generate_transit_time(service_level, zone, carrier):
    """Generate realistic transit time following normal distribution."""
    specs = SERVICE_LEVEL_SPECS[service_level]
    carrier_adj = CARRIER_ADJUSTMENTS[carrier]

    # Base time + zone effect
    mean_time = specs["base_time"] + (zone - 1) * specs["zone_factor"]

    # Apply carrier adjustment with some random variability
    # This ensures carriers don't always rank in the same order
    carrier_variability = np.random.normal(0, 0.1)  # ±10% random variation
    adjusted_mult = carrier_adj["time_mult"] * (1 + carrier_variability)
    mean_time *= max(0.7, min(1.5, adjusted_mult))  # Clamp between 0.7x and 1.5x

    # Generate with normal distribution, ensure positive
    time = np.random.normal(mean_time, specs["time_std"])
    return max(0.5, time)  # Minimum 0.5 days


def generate_shipping_cost(service_level, zone, carrier, weight, volume):
    """Generate realistic shipping cost following normal distribution."""
    specs = SERVICE_LEVEL_SPECS[service_level]
    carrier_adj = CARRIER_ADJUSTMENTS[carrier]

    # Base cost + zone effect + weight/volume factors
    mean_cost = specs["base_cost"] + (zone - 1) * specs["zone_factor"] * 2
    mean_cost += weight * 0.5 + volume * 0.001  # Weight and volume factors

    # Apply carrier adjustment with some random variability
    # This ensures carriers don't always rank in the same order for cost
    carrier_variability = np.random.normal(0, 0.08)  # ±8% random variation
    adjusted_mult = carrier_adj["cost_mult"] * (1 + carrier_variability)
    mean_cost *= max(0.8, min(1.3, adjusted_mult))  # Clamp between 0.8x and 1.3x

    # Generate with normal distribution, ensure positive
    cost = np.random.normal(mean_cost, specs["cost_std"])
    return max(2.0, cost)  # Minimum $2.00


def generate_package_dimensions():
    """Generate realistic package dimensions."""
    # Common package sizes with some variation
    base_sizes = [
        (12, 9, 3, 1.5),  # Small envelope
        (14, 11, 4, 2.8),  # Medium box
        (18, 14, 6, 4.2),  # Large box
        (24, 18, 12, 8.5),  # Extra large box
        (10, 8, 2, 0.8),  # Document envelope
        (16, 12, 8, 5.0),  # Standard box
    ]

    base_l, base_w, base_h, base_weight = random.choice(base_sizes)

    # Add some realistic variation
    length = max(6, np.random.normal(base_l, base_l * 0.1))
    width = max(4, np.random.normal(base_w, base_w * 0.1))
    height = max(1, np.random.normal(base_h, base_h * 0.15))
    weight = max(0.1, np.random.normal(base_weight, base_weight * 0.2))

    return length, width, height, weight


def generate_shipping_dates(n_records, start_date="2023-01-01", end_date="2024-12-31"):
    """Generate realistic shipping dates with business day bias."""
    start = datetime.strptime(start_date, "%Y-%m-%d")
    end = datetime.strptime(end_date, "%Y-%m-%d")

    dates = []
    for _ in range(n_records):
        # Generate random date in range
        random_date = start + timedelta(days=random.randint(0, (end - start).days))

        # Bias towards business days (Monday-Friday)
        if random_date.weekday() >= 5:  # Weekend
            if random.random() < 0.7:  # 70% chance to move to weekday
                days_to_add = 1 if random_date.weekday() == 5 else 2
                random_date += timedelta(days=days_to_add)

        dates.append(random_date.strftime("%Y-%m-%d"))

    return dates


def generate_statistical_dataset(n_records=50000):
    """Generate comprehensive dataset for statistical analysis."""
    print(f"Generating {n_records:,} records for statistical analysis...")

    data = []

    for i in range(n_records):
        if i % 10000 == 0:
            print(f"Progress: {i:,}/{n_records:,} ({i/n_records*100:.1f}%)")

        # Random selections
        carrier = random.choice(CARRIERS)
        service_level = random.choice(SERVICE_LEVELS)
        origin_zone = random.randint(1, 9)
        dest_zone = random.randint(1, 9)

        # Package characteristics
        length, width, height, weight = generate_package_dimensions()
        volume = length * width * height
        insurance_value = random.uniform(10, 2000)

        # Generate transit time and cost with proper distributions
        transit_time = generate_transit_time(service_level, dest_zone, carrier)
        shipping_cost = generate_shipping_cost(
            service_level, dest_zone, carrier, weight, volume
        )

        data.append(
            {
                "ship_date": None,  # Will be filled after
                "origin_zone": origin_zone,
                "dest_zone": dest_zone,
                "carrier": carrier,
                "service_level": service_level,
                "package_weight_lbs": round(weight, 2),
                "package_length_in": round(length, 1),
                "package_width_in": round(width, 1),
                "package_height_in": round(height, 1),
                "package_volume_cubic_in": round(volume, 2),
                "insurance_value": round(insurance_value, 2),
                "transit_time_days": round(transit_time, 2),
                "shipping_cost_usd": round(shipping_cost, 2),
            }
        )

    # Create DataFrame and add shipping dates
    df = pd.DataFrame(data)
    df["ship_date"] = generate_shipping_dates(n_records)

    print(f"Generated dataset with {len(df):,} records")
    return df


def generate_distribution_metadata(df):
    """Generate statistical metadata for the dataset."""
    metadata = {
        "carriers": sorted(df["carrier"].unique().tolist()),
        "service_levels": sorted(df["service_level"].unique().tolist()),
        "usps_zones": sorted(df["dest_zone"].unique().tolist()),
        "date_range": {"start": df["ship_date"].min(), "end": df["ship_date"].max()},
        "total_records": len(df),
        "distributions": {},
    }

    # Generate distribution statistics for each service level and zone
    for service in metadata["service_levels"]:
        metadata["distributions"][service] = {}
        service_data = df[df["service_level"] == service]

        for zone in metadata["usps_zones"]:
            zone_data = service_data[service_data["dest_zone"] == zone]

            if len(zone_data) > 0:
                metadata["distributions"][service][f"zone_{zone}"] = {
                    "transit_time": {
                        "mean": float(zone_data["transit_time_days"].mean()),
                        "std": float(zone_data["transit_time_days"].std()),
                        "median": float(zone_data["transit_time_days"].median()),
                        "min": float(zone_data["transit_time_days"].min()),
                        "max": float(zone_data["transit_time_days"].max()),
                        "count": int(len(zone_data)),
                    },
                    "shipping_cost": {
                        "mean": float(zone_data["shipping_cost_usd"].mean()),
                        "std": float(zone_data["shipping_cost_usd"].std()),
                        "median": float(zone_data["shipping_cost_usd"].median()),
                        "min": float(zone_data["shipping_cost_usd"].min()),
                        "max": float(zone_data["shipping_cost_usd"].max()),
                        "count": int(len(zone_data)),
                    },
                }

    return metadata


def main():
    """Generate statistical analysis dataset."""
    # Generate the dataset
    df = generate_statistical_dataset(50000)

    # Generate metadata
    metadata = generate_distribution_metadata(df)

    # Save the data
    output_dir = Path(__file__).parent

    print("Saving dataset...")
    df.to_parquet(output_dir / "statistical_shipping_data.parquet", index=False)
    df.to_csv(output_dir / "statistical_shipping_data.csv", index=False)

    print("Saving metadata...")
    with open(output_dir / "distribution_metadata.json", "w") as f:
        json.dump(metadata, f, indent=2)

    # Print summary statistics
    print("\n" + "=" * 60)
    print("DATASET SUMMARY")
    print("=" * 60)
    print(f"Total Records: {len(df):,}")
    print(
        f"Date Range: {metadata['date_range']['start']} to {metadata['date_range']['end']}"
    )
    print(f"Carriers: {', '.join(metadata['carriers'])}")
    print(f"Service Levels: {', '.join(metadata['service_levels'])}")
    print(f"USPS Zones: {', '.join(map(str, metadata['usps_zones']))}")

    print("\nTRANSIT TIME STATISTICS BY SERVICE LEVEL:")
    for service in metadata["service_levels"]:
        service_data = df[df["service_level"] == service]
        print(
            f"  {service}: {service_data['transit_time_days'].mean():.2f} ± {service_data['transit_time_days'].std():.2f} days"
        )

    print("\nSHIPPING COST STATISTICS BY SERVICE LEVEL:")
    for service in metadata["service_levels"]:
        service_data = df[df["service_level"] == service]
        print(
            f"  {service}: ${service_data['shipping_cost_usd'].mean():.2f} ± ${service_data['shipping_cost_usd'].std():.2f}"
        )

    print(f"\nFiles saved to: {output_dir}")
    print("- statistical_shipping_data.parquet")
    print("- statistical_shipping_data.csv")
    print("- distribution_metadata.json")


if __name__ == "__main__":
    main()
