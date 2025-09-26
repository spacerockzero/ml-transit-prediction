#!/usr/bin/env python3
"""
Statistical Analysis Engine for Shipping Data
Provides comprehensive analysis tools for transit time and cost distributions.
"""

import pandas as pd
import numpy as np
import json
from scipy import stats
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
import sys


class ShippingStatisticsAnalyzer:
    """Comprehensive statistical analysis for shipping data."""

    def __init__(self, data_path: str = None):
        """Initialize the analyzer with shipping data."""
        if data_path is None:
            data_path = Path(__file__).parent / "statistical_shipping_data.parquet"

        self.data_path = Path(data_path)
        self.df = None
        self.metadata = None
        self.load_data()

    def load_data(self):
        """Load the shipping data and metadata."""
        try:
            print(f"Loading data from {self.data_path}", file=sys.stderr)
            self.df = pd.read_parquet(self.data_path)

            # Load metadata
            metadata_path = self.data_path.parent / "distribution_metadata.json"
            with open(metadata_path, "r") as f:
                self.metadata = json.load(f)

            print(f"Loaded {len(self.df):,} shipping records", file=sys.stderr)

        except Exception as e:
            print(f"Error loading data: {e}", file=sys.stderr)
            raise

    def get_distribution_stats(
        self, service_level: str, zone: int, metric: str = "transit_time_days"
    ) -> Dict:
        """Get detailed distribution statistics for a service level and zone."""
        data = self.df[
            (self.df["service_level"] == service_level) & (self.df["dest_zone"] == zone)
        ][metric]

        if len(data) == 0:
            return None

        # Calculate comprehensive statistics
        stats_dict = {
            "count": int(len(data)),
            "mean": float(data.mean()),
            "median": float(data.median()),
            "std": float(data.std()),
            "var": float(data.var()),
            "min": float(data.min()),
            "max": float(data.max()),
            "q25": float(data.quantile(0.25)),
            "q75": float(data.quantile(0.75)),
            "iqr": float(data.quantile(0.75) - data.quantile(0.25)),
            "skewness": float(stats.skew(data)),
            "kurtosis": float(stats.kurtosis(data)),
            "percentiles": {
                "p10": float(data.quantile(0.10)),
                "p20": float(data.quantile(0.20)),
                "p30": float(data.quantile(0.30)),
                "p40": float(data.quantile(0.40)),
                "p50": float(data.quantile(0.50)),
                "p60": float(data.quantile(0.60)),
                "p70": float(data.quantile(0.70)),
                "p80": float(data.quantile(0.80)),
                "p90": float(data.quantile(0.90)),
                "p95": float(data.quantile(0.95)),
                "p99": float(data.quantile(0.99)),
            },
        }

        # Normal distribution test
        shapiro_stat, shapiro_p = stats.shapiro(data.sample(min(5000, len(data))))
        stats_dict["normality_test"] = {
            "shapiro_wilk_statistic": float(shapiro_stat),
            "shapiro_wilk_p_value": float(shapiro_p),
            "is_normal_p05": shapiro_p > 0.05,
        }

        return stats_dict

    def get_all_distributions(self) -> Dict:
        """Get distribution statistics for all service levels and zones."""
        distributions = {}

        for service in self.metadata["service_levels"]:
            distributions[service] = {}

            for zone in self.metadata["usps_zones"]:
                zone_key = f"zone_{zone}"
                distributions[service][zone_key] = {
                    "transit_time": self.get_distribution_stats(
                        service, zone, "transit_time_days"
                    ),
                    "shipping_cost": self.get_distribution_stats(
                        service, zone, "shipping_cost_usd"
                    ),
                }

        return distributions

    def compare_service_levels_2sigma(self, zones: List[int] = None) -> Dict:
        """Compare service levels using 2-sigma confidence intervals."""
        if zones is None:
            zones = self.metadata["usps_zones"]

        results = {}

        for zone in zones:
            zone_results = {}

            for service in self.metadata["service_levels"]:
                data = self.df[
                    (self.df["service_level"] == service)
                    & (self.df["dest_zone"] == zone)
                ]["transit_time_days"]

                if len(data) > 0:
                    mean = data.mean()
                    std = data.std()

                    zone_results[service] = {
                        "mean": float(mean),
                        "std": float(std),
                        "lower_2sigma": float(mean - 2 * std),
                        "upper_2sigma": float(mean + 2 * std),
                        "range_2sigma": float(4 * std),
                        "confidence_interval_95": [
                            float(mean - 1.96 * std / np.sqrt(len(data))),
                            float(mean + 1.96 * std / np.sqrt(len(data))),
                        ],
                    }

            # Find the winner (lowest upper bound at 2-sigma)
            if zone_results:
                winner = min(
                    zone_results.keys(), key=lambda x: zone_results[x]["upper_2sigma"]
                )
                zone_results["winner"] = {
                    "service_level": winner,
                    "reason": "lowest_2sigma_upper_bound",
                    "transit_time_upper": zone_results[winner]["upper_2sigma"],
                }

            results[f"zone_{zone}"] = zone_results

        return results

    def compare_carriers_by_zone(
        self, zones: List[int] = None, metric: str = "transit_time_days"
    ) -> Dict:
        """Compare each carrier's service levels against other carriers within each zone."""
        if zones is None:
            zones = self.metadata["usps_zones"]

        results = {}

        for zone in zones:
            zone_data = self.df[self.df["dest_zone"] == zone]
            zone_results = {"zone": zone, "comparisons": {}}

            # Get all unique carriers and service levels in this zone
            carriers = zone_data["carrier"].unique()
            service_levels = zone_data["service_level"].unique()

            # Compare each service level across carriers
            for service in service_levels:
                service_comparison = {}

                for carrier in carriers:
                    carrier_service_data = zone_data[
                        (zone_data["carrier"] == carrier)
                        & (zone_data["service_level"] == service)
                    ][metric]

                    if len(carrier_service_data) > 5:  # Need sufficient data
                        mean = carrier_service_data.mean()
                        std = carrier_service_data.std()
                        median = carrier_service_data.median()
                        q25 = carrier_service_data.quantile(0.25)
                        q75 = carrier_service_data.quantile(0.75)

                        service_comparison[carrier] = {
                            "mean": float(mean),
                            "median": float(median),
                            "std": float(std),
                            "q25": float(q25),
                            "q75": float(q75),
                            "sample_size": len(carrier_service_data),
                            "lower_2sigma": float(mean - 2 * std),
                            "upper_2sigma": float(mean + 2 * std),
                            "reliability_score": float(
                                1 / (std + 0.1)
                            ),  # Lower std = higher reliability
                        }

                # Find the best carrier for this service level in this zone
                if service_comparison:
                    # Only consider carriers with all required statistics
                    valid_carriers = {
                        k: v
                        for k, v in service_comparison.items()
                        if isinstance(v, dict)
                        and all(key in v for key in ["median", "upper_2sigma"])
                    }

                    if valid_carriers:
                        if metric == "transit_time_days":
                            # For transit time, lower is better
                            best_carrier_median = min(
                                valid_carriers.keys(),
                                key=lambda x: valid_carriers[x]["median"],
                            )
                            best_carrier_2sigma = min(
                                valid_carriers.keys(),
                                key=lambda x: valid_carriers[x]["upper_2sigma"],
                            )
                            ranking_metric = "median_transit_time"
                        else:  # shipping_cost_usd
                            # For cost, lower is better
                            best_carrier_median = min(
                                valid_carriers.keys(),
                                key=lambda x: valid_carriers[x]["median"],
                            )
                            best_carrier_2sigma = min(
                                valid_carriers.keys(),
                                key=lambda x: valid_carriers[x]["upper_2sigma"],
                            )
                            ranking_metric = "median_cost"

                        service_comparison["winner_median"] = {
                            "carrier": best_carrier_median,
                            "reason": f"lowest_{ranking_metric}",
                            "value": valid_carriers[best_carrier_median]["median"],
                            "advantage_over_avg": float(
                                np.mean([v["median"] for v in valid_carriers.values()])
                                - valid_carriers[best_carrier_median]["median"]
                            ),
                        }

                        service_comparison["winner_2sigma"] = {
                            "carrier": best_carrier_2sigma,
                            "reason": f"lowest_2sigma_upper_bound",
                            "value": valid_carriers[best_carrier_2sigma][
                                "upper_2sigma"
                            ],
                            "median": valid_carriers[best_carrier_2sigma]["median"],
                            "std": valid_carriers[best_carrier_2sigma]["std"],
                            "advantage_over_avg": float(
                                np.mean(
                                    [v["upper_2sigma"] for v in valid_carriers.values()]
                                )
                                - valid_carriers[best_carrier_2sigma]["upper_2sigma"]
                            ),
                            "reliability_advantage": "Most consistent performance with lowest worst-case scenario",
                        }

                        # Keep the old 'winner' for backward compatibility (using median)
                        service_comparison["winner"] = service_comparison[
                            "winner_median"
                        ]

                zone_results["comparisons"][service] = service_comparison

            # Overall zone winners (best carrier-service combinations)
            all_combinations_median = []
            all_combinations_2sigma = []
            for service, carriers_data in zone_results["comparisons"].items():
                for carrier, stats in carriers_data.items():
                    if isinstance(stats, dict) and all(
                        key in stats
                        for key in ["median", "upper_2sigma", "reliability_score"]
                    ):
                        all_combinations_median.append(
                            {
                                "carrier": carrier,
                                "service": service,
                                "median": stats["median"],
                                "reliability": stats["reliability_score"],
                            }
                        )
                        all_combinations_2sigma.append(
                            {
                                "carrier": carrier,
                                "service": service,
                                "upper_2sigma": stats["upper_2sigma"],
                                "median": stats["median"],
                                "std": stats["std"],
                            }
                        )

            if all_combinations_median:
                # Best overall combination by median (lowest median with reliability weighting)
                best_combo_median = min(
                    all_combinations_median,
                    key=lambda x: x["median"] / x["reliability"],
                )
                zone_results["overall_winner_median"] = {
                    "carrier": best_combo_median["carrier"],
                    "service_level": best_combo_median["service"],
                    "median_value": best_combo_median["median"],
                    "reliability_score": best_combo_median["reliability"],
                }

            if all_combinations_2sigma:
                # Best overall combination by 2-sigma upper bound (most reliable worst-case)
                best_combo_2sigma = min(
                    all_combinations_2sigma, key=lambda x: x["upper_2sigma"]
                )
                zone_results["overall_winner_2sigma"] = {
                    "carrier": best_combo_2sigma["carrier"],
                    "service_level": best_combo_2sigma["service"],
                    "upper_2sigma_value": best_combo_2sigma["upper_2sigma"],
                    "median_value": best_combo_2sigma["median"],
                    "std_value": best_combo_2sigma["std"],
                    "reliability_reason": "Lowest 2-sigma upper bound (best worst-case performance)",
                }

            # Keep the old 'overall_winner' for backward compatibility
            if "overall_winner_median" in zone_results:
                zone_results["overall_winner"] = zone_results["overall_winner_median"]

            results[f"zone_{zone}"] = zone_results

        return {
            "metric": metric,
            "zones": results,
            "summary": self._generate_carrier_comparison_summary(results, metric),
        }

    def _generate_carrier_comparison_summary(self, results: Dict, metric: str) -> Dict:
        """Generate a summary of carrier performance across all zones."""
        carrier_wins_median = {}
        carrier_wins_2sigma = {}
        service_wins_median = {}
        service_wins_2sigma = {}

        for zone_key, zone_data in results.items():
            if zone_key.startswith("zone_"):
                # Count service-level wins per carrier (median-based)
                for service, comparison in zone_data["comparisons"].items():
                    if "winner_median" in comparison:
                        winner = comparison["winner_median"]["carrier"]
                        carrier_wins_median[winner] = (
                            carrier_wins_median.get(winner, 0) + 1
                        )

                        service_key = f"{winner}_{service}"
                        service_wins_median[service_key] = (
                            service_wins_median.get(service_key, 0) + 1
                        )

                    # Count service-level wins per carrier (2-sigma-based)
                    if "winner_2sigma" in comparison:
                        winner = comparison["winner_2sigma"]["carrier"]
                        carrier_wins_2sigma[winner] = (
                            carrier_wins_2sigma.get(winner, 0) + 1
                        )

                        service_key = f"{winner}_{service}"
                        service_wins_2sigma[service_key] = (
                            service_wins_2sigma.get(service_key, 0) + 1
                        )

                # Count overall zone wins
                if "overall_winner_median" in zone_data:
                    winner = zone_data["overall_winner_median"]["carrier"]
                    carrier_wins_median[f"{winner}_overall"] = (
                        carrier_wins_median.get(f"{winner}_overall", 0) + 1
                    )

                if "overall_winner_2sigma" in zone_data:
                    winner = zone_data["overall_winner_2sigma"]["carrier"]
                    carrier_wins_2sigma[f"{winner}_overall"] = (
                        carrier_wins_2sigma.get(f"{winner}_overall", 0) + 1
                    )

        return {
            "carrier_wins_by_median": carrier_wins_median,
            "carrier_wins_by_2sigma": carrier_wins_2sigma,
            "best_combinations_median": service_wins_median,
            "best_combinations_2sigma": service_wins_2sigma,
            "top_carrier_median": (
                max(carrier_wins_median.items(), key=lambda x: x[1])[0]
                if carrier_wins_median
                else None
            ),
            "top_carrier_2sigma": (
                max(carrier_wins_2sigma.items(), key=lambda x: x[1])[0]
                if carrier_wins_2sigma
                else None
            ),
            "reliability_insights": {
                "median_winner": "Best average performance",
                "2sigma_winner": "Most reliable with best worst-case performance",
            },
        }

    def find_best_service_by_percentile(
        self, percentile: float, zones: List[int] = None, method: str = "median"
    ) -> Dict:
        """Find best service level based on percentile threshold."""
        if zones is None:
            zones = self.metadata["usps_zones"]

        results = {}

        for zone in zones:
            zone_results = {}

            for service in self.metadata["service_levels"]:
                data = self.df[
                    (self.df["service_level"] == service)
                    & (self.df["dest_zone"] == zone)
                ]["transit_time_days"]

                if len(data) > 0:
                    # Get data within percentile threshold
                    threshold_value = data.quantile(percentile / 100)
                    filtered_data = data[data <= threshold_value]

                    if len(filtered_data) > 0:
                        if method == "median":
                            metric_value = filtered_data.median()
                        else:  # mean
                            metric_value = filtered_data.mean()

                        zone_results[service] = {
                            "metric_value": float(metric_value),
                            "percentile_threshold": float(threshold_value),
                            "records_in_percentile": int(len(filtered_data)),
                            "total_records": int(len(data)),
                            "percentile_coverage": float(
                                len(filtered_data) / len(data) * 100
                            ),
                            "method": method,
                        }

            # Find the winner (lowest metric value)
            if zone_results:
                winner = min(
                    zone_results.keys(), key=lambda x: zone_results[x]["metric_value"]
                )
                zone_results["winner"] = {
                    "service_level": winner,
                    "reason": f"lowest_{method}_in_{percentile}th_percentile",
                    "metric_value": zone_results[winner]["metric_value"],
                }

            results[f"zone_{zone}"] = zone_results

        return results

    def get_histogram_data(
        self,
        service_level: str,
        zone: int,
        metric: str = "transit_time_days",
        bins: int = 30,
    ) -> Dict:
        """Get histogram data for charting."""
        data = self.df[
            (self.df["service_level"] == service_level) & (self.df["dest_zone"] == zone)
        ][metric]

        if len(data) == 0:
            return None

        hist, bin_edges = np.histogram(data, bins=bins)
        bin_centers = (bin_edges[:-1] + bin_edges[1:]) / 2

        return {
            "bins": bin_centers.tolist(),
            "counts": hist.tolist(),
            "total_count": int(len(data)),
            "bin_width": float(bin_edges[1] - bin_edges[0]),
        }

    def get_service_level_summary(self) -> Dict:
        """Get summary statistics for all service levels."""
        summary = {}

        for service in self.metadata["service_levels"]:
            service_data = self.df[self.df["service_level"] == service]

            summary[service] = {
                "total_shipments": int(len(service_data)),
                "avg_transit_time": float(service_data["transit_time_days"].mean()),
                "avg_cost": float(service_data["shipping_cost_usd"].mean()),
                "transit_time_std": float(service_data["transit_time_days"].std()),
                "cost_std": float(service_data["shipping_cost_usd"].std()),
                "zones_served": sorted(service_data["dest_zone"].unique().tolist()),
            }

        return summary

    def get_carrier_service_summary(self) -> Dict:
        """Get summary statistics for all carriers and service levels."""
        summary = {}

        # Get unique carriers
        carriers = self.df["carrier"].unique()

        for carrier in carriers:
            for service in self.metadata["service_levels"]:
                service_data = self.df[
                    (self.df["carrier"] == carrier)
                    & (self.df["service_level"] == service)
                ]

                if len(service_data) > 0:
                    key = f"{carrier}_{service}"
                    summary[key] = {
                        "carrier": carrier,
                        "service_level": service,
                        "total_shipments": int(len(service_data)),
                        "avg_transit_time": float(
                            service_data["transit_time_days"].mean()
                        ),
                        "median_transit_time": float(
                            service_data["transit_time_days"].median()
                        ),
                        "avg_cost": float(service_data["shipping_cost_usd"].mean()),
                        "median_cost": float(
                            service_data["shipping_cost_usd"].median()
                        ),
                        "transit_time_std": float(
                            service_data["transit_time_days"].std()
                        ),
                        "cost_std": float(service_data["shipping_cost_usd"].std()),
                        "zones_served": sorted(
                            service_data["dest_zone"].unique().tolist()
                        ),
                    }

        return summary

    def get_carrier_zone_summary(self) -> Dict:
        """Get summary statistics for all carriers, service levels, and zones."""
        summary = {}

        # Get unique carriers and zones
        carriers = self.df["carrier"].unique()
        zones = sorted(self.df["dest_zone"].unique())

        for carrier in carriers:
            for service in self.metadata["service_levels"]:
                for zone in zones:
                    service_data = self.df[
                        (self.df["carrier"] == carrier)
                        & (self.df["service_level"] == service)
                        & (self.df["dest_zone"] == zone)
                    ]

                    if len(service_data) > 0:
                        key = f"{carrier}_{service}_zone_{zone}"
                        summary[key] = {
                            "carrier": carrier,
                            "service_level": service,
                            "zone": int(zone),
                            "total_shipments": int(len(service_data)),
                            "avg_transit_time": float(
                                service_data["transit_time_days"].mean()
                            ),
                            "median_transit_time": float(
                                service_data["transit_time_days"].median()
                            ),
                            "avg_cost": float(service_data["shipping_cost_usd"].mean()),
                            "median_cost": float(
                                service_data["shipping_cost_usd"].median()
                            ),
                            "transit_time_std": float(
                                service_data["transit_time_days"].std()
                            ),
                            "cost_std": float(service_data["shipping_cost_usd"].std()),
                        }

        return summary

    def get_carrier_zone_summary_percentile(
        self, percentile: float, method: str = "median"
    ) -> Dict:
        """Get summary statistics for all carriers, service levels, and zones within a percentile threshold."""
        summary = {}

        # Get unique carriers and zones
        carriers = self.df["carrier"].unique()
        zones = sorted(self.df["dest_zone"].unique())

        for carrier in carriers:
            for service in self.metadata["service_levels"]:
                for zone in zones:
                    service_data = self.df[
                        (self.df["carrier"] == carrier)
                        & (self.df["service_level"] == service)
                        & (self.df["dest_zone"] == zone)
                    ]

                    if len(service_data) > 0:
                        # Apply percentile filtering
                        transit_data = service_data["transit_time_days"]
                        cost_data = service_data["shipping_cost_usd"]

                        # Get percentile threshold for transit time
                        threshold_value = transit_data.quantile(percentile / 100)

                        # Filter data within percentile threshold
                        filtered_indices = transit_data <= threshold_value
                        filtered_transit_data = transit_data[filtered_indices]
                        filtered_cost_data = cost_data[filtered_indices]

                        if len(filtered_transit_data) > 0:
                            key = f"{carrier}_{service}_zone_{zone}"

                            # Calculate metrics using the specified method
                            if method == "median":
                                transit_metric = float(filtered_transit_data.median())
                                cost_metric = float(filtered_cost_data.median())
                            else:  # mean
                                transit_metric = float(filtered_transit_data.mean())
                                cost_metric = float(filtered_cost_data.mean())

                            summary[key] = {
                                "carrier": carrier,
                                "service_level": service,
                                "zone": int(zone),
                                "total_shipments": int(len(service_data)),
                                "records_in_percentile": int(
                                    len(filtered_transit_data)
                                ),
                                "percentile_coverage": float(
                                    len(filtered_transit_data) / len(service_data) * 100
                                ),
                                "percentile_threshold": float(threshold_value),
                                "method": method,
                                "avg_transit_time": transit_metric,
                                "median_transit_time": transit_metric,  # Using the same value for consistency
                                "avg_cost": cost_metric,
                                "median_cost": cost_metric,  # Using the same value for consistency
                                "transit_time_std": float(filtered_transit_data.std()),
                                "cost_std": float(filtered_cost_data.std()),
                            }

        return summary


def main():
    """CLI interface for the statistical analyzer."""
    if len(sys.argv) < 2:
        print("Usage: python statistics_analyzer.py <command> [args]")
        print("Commands:")
        print("  distributions - Get all distribution statistics")
        print("  summary - Get service level summary")
        print("  compare-2sigma - Compare service levels using 2-sigma")
        print("  percentile <percentile> <method> - Find best service by percentile")
        return

    analyzer = ShippingStatisticsAnalyzer()
    command = sys.argv[1]

    if command == "distributions":
        result = analyzer.get_all_distributions()
        print(json.dumps(result, indent=2))

    elif command == "summary":
        result = analyzer.get_service_level_summary()
        print(json.dumps(result, indent=2))

    elif command == "compare-2sigma":
        result = analyzer.compare_service_levels_2sigma()
        print(json.dumps(result, indent=2))

    elif command == "percentile":
        if len(sys.argv) < 4:
            print("Usage: percentile <percentile> <method>")
            print("Example: percentile 80 median")
            return

        percentile = float(sys.argv[2])
        method = sys.argv[3]
        result = analyzer.find_best_service_by_percentile(percentile, method=method)
        print(json.dumps(result, indent=2))

    else:
        print(f"Unknown command: {command}")


if __name__ == "__main__":
    main()
