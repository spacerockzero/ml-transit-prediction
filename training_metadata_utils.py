"""
Training metadata utilities for tracking and updating model training information.
"""

import json
import pandas as pd
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional


class TrainingMetadataManager:
    """Manages training metadata for the ML models."""

    def __init__(self, metadata_file: str = "training_metadata.json"):
        self.metadata_file = Path(metadata_file)
        self.root_dir = Path(__file__).parent
        self.metadata_path = self.root_dir / self.metadata_file

    def update_metadata(
        self,
        data_file_path: str,
        model_version: str = "1.0.0",
        training_duration_minutes: float = 0.0,
        validation_metrics: Optional[Dict[str, float]] = None,
        additional_data_sources: Optional[List[str]] = None,
    ) -> None:
        """
        Update training metadata after a training session.

        Args:
            data_file_path: Path to the training data file
            model_version: Version of the trained model
            training_duration_minutes: How long training took
            validation_metrics: Model validation metrics
            additional_data_sources: Any additional data sources used
        """
        try:
            # Analyze the training data
            data_info = self._analyze_training_data(data_file_path)

            # Create metadata structure
            metadata = {
                "last_updated": datetime.utcnow().isoformat() + "Z",
                "training_data": {
                    "total_shipments": data_info["total_records"],
                    "date_range": data_info["date_range"],
                    "carriers": sorted(data_info["carriers"]),
                    "service_levels": sorted(data_info["service_levels"]),
                    "zones_covered": sorted(data_info["zones"]),
                },
                "model_info": {
                    "version": model_version,
                    "training_duration_minutes": round(training_duration_minutes, 2),
                    "features_count": data_info.get("features_count", 17),
                    "validation_accuracy": validation_metrics
                    or {"transit_time_mae": 0.0, "shipping_cost_mae": 0.0},
                },
                "data_sources": [data_file_path] + (additional_data_sources or []),
            }

            # Write metadata to file
            with open(self.metadata_path, "w") as f:
                json.dump(metadata, f, indent=2)

            print(f"✅ Training metadata updated: {self.metadata_path}")
            print(f"📊 Total shipments: {data_info['total_records']:,}")
            print(
                f"📅 Date range: {data_info['date_range']['start']} to {data_info['date_range']['end']}"
            )
            print(
                f"🚛 Carriers: {len(data_info['carriers'])} ({', '.join(sorted(data_info['carriers']))})"
            )

        except Exception as e:
            print(f"❌ Failed to update training metadata: {e}")

    def _analyze_training_data(self, data_file_path: str) -> Dict[str, Any]:
        """Analyze the training data file to extract metadata."""
        file_path = Path(data_file_path)

        if not file_path.exists():
            # Try relative to root directory
            file_path = self.root_dir / data_file_path

        if not file_path.exists():
            raise FileNotFoundError(f"Training data file not found: {data_file_path}")

        # Read the data file
        if file_path.suffix == ".csv":
            df = pd.read_csv(file_path)
        elif file_path.suffix == ".parquet":
            df = pd.read_parquet(file_path)
        else:
            raise ValueError(f"Unsupported file format: {file_path.suffix}")

        # Extract metadata
        info = {
            "total_records": len(df),
            "carriers": df["carrier"].unique().tolist(),
            "service_levels": (
                df["service_level"].unique().tolist()
                if "service_level" in df.columns
                else []
            ),
            "zones": [],
            "date_range": {"start": "", "end": ""},
            "features_count": len(df.columns),
        }

        # Extract zones
        if "dest_zone" in df.columns:
            info["zones"] = df["dest_zone"].unique().tolist()
        elif "zone" in df.columns:
            info["zones"] = df["zone"].unique().tolist()

        # Extract date range
        if "ship_date" in df.columns:
            dates = pd.to_datetime(df["ship_date"])
            info["date_range"] = {
                "start": dates.min().strftime("%Y-%m-%d"),
                "end": dates.max().strftime("%Y-%m-%d"),
            }

        return info

    def get_metadata(self) -> Dict[str, Any]:
        """Get current training metadata."""
        try:
            with open(self.metadata_path, "r") as f:
                return json.load(f)
        except FileNotFoundError:
            return self._get_default_metadata()
        except Exception as e:
            print(f"Error reading metadata: {e}")
            return self._get_default_metadata()

    def _get_default_metadata(self) -> Dict[str, Any]:
        """Return default metadata if file doesn't exist."""
        return {
            "last_updated": "2024-01-01T00:00:00Z",
            "training_data": {
                "total_shipments": 0,
                "date_range": {"start": "2023-01-01", "end": "2024-12-31"},
                "carriers": [],
                "service_levels": [],
                "zones_covered": [],
            },
            "model_info": {
                "version": "1.0.0",
                "training_duration_minutes": 0,
                "features_count": 17,
                "validation_accuracy": {
                    "transit_time_mae": 0.0,
                    "shipping_cost_mae": 0.0,
                },
            },
            "data_sources": [],
        }


def update_training_metadata(
    data_file_path: str,
    model_version: str = "1.0.0",
    training_duration_minutes: float = 0.0,
    validation_metrics: Optional[Dict[str, float]] = None,
    additional_data_sources: Optional[List[str]] = None,
) -> None:
    """
    Convenience function to update training metadata.

    Usage in training scripts:
        from training_metadata_utils import update_training_metadata

        start_time = time.time()
        # ... training code ...
        duration = (time.time() - start_time) / 60

        update_training_metadata(
            data_file_path="transit_time_cost/historical_shipments.csv",
            model_version="1.1.0",
            training_duration_minutes=duration,
            validation_metrics={"transit_time_mae": 0.85, "shipping_cost_mae": 2.34}
        )
    """
    manager = TrainingMetadataManager()
    manager.update_metadata(
        data_file_path=data_file_path,
        model_version=model_version,
        training_duration_minutes=training_duration_minutes,
        validation_metrics=validation_metrics,
        additional_data_sources=additional_data_sources,
    )


if __name__ == "__main__":
    # Example usage
    manager = TrainingMetadataManager()

    # Simulate updating metadata after training
    manager.update_metadata(
        data_file_path="transit_time_cost/historical_shipments.csv",
        model_version="1.1.0",
        training_duration_minutes=5.5,
        validation_metrics={"transit_time_mae": 0.95, "shipping_cost_mae": 3.42},
        additional_data_sources=[
            "statistical_analysis/statistical_shipping_data.parquet"
        ],
    )
