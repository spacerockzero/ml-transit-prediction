from training_metadata_utils import update_training_metadata
import time

# Simulate a training session
print("🔄 Simulating training session...")
time.sleep(2)

# Update metadata with new information
update_training_metadata(
    data_file_path="transit_time_cost/historical_shipments.csv",
    model_version="1.2.0",
    training_duration_minutes=3.7,
    validation_metrics={
        "transit_time_mae": 0.82,
        "shipping_cost_mae": 2.95
    },
    additional_data_sources=[
        "statistical_analysis/statistical_shipping_data.parquet",
        "transit_time_zones/historical_shipments.csv"
    ]
)
print("✅ Test training metadata update completed!")
