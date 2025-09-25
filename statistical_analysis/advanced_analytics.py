#!/usr/bin/env python3
"""
Advanced Analytics Module for Shipping Data Mining
Provides comprehensive business intelligence and predictive analytics.
"""

import pandas as pd
import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from pathlib import Path
import warnings

warnings.filterwarnings("ignore")


class ShippingAnalytics:
    """Advanced analytics for shipping dataset."""

    def __init__(self, data_path=None):
        if data_path is None:
            data_path = Path(__file__).parent / "statistical_shipping_data.parquet"
        self.df = pd.read_parquet(data_path)
        self.df["ship_date"] = pd.to_datetime(self.df["ship_date"])
        self.df["day_of_week"] = self.df["ship_date"].dt.day_name()
        self.df["month"] = self.df["ship_date"].dt.month
        self.df["quarter"] = self.df["ship_date"].dt.quarter

    def temporal_patterns(self):
        """Analyze temporal shipping patterns."""
        analysis = {}

        # Day of week patterns
        dow_stats = (
            self.df.groupby("day_of_week")
            .agg(
                {
                    "transit_time_days": ["mean", "std", "count"],
                    "shipping_cost_usd": ["mean", "std"],
                }
            )
            .round(2)
        )

        # Flatten MultiIndex columns for JSON serialization
        dow_flattened = {}
        for col_tuple in dow_stats.columns:
            col_name = f"{col_tuple[0]}_{col_tuple[1]}"
            dow_flattened[col_name] = dow_stats[col_tuple].to_dict()
        analysis["day_of_week"] = dow_flattened

        # Monthly seasonality
        monthly_stats = (
            self.df.groupby("month")
            .agg(
                {
                    "transit_time_days": ["mean", "std", "count"],
                    "shipping_cost_usd": ["mean", "std"],
                }
            )
            .round(2)
        )

        # Flatten MultiIndex columns for monthly data
        monthly_flattened = {}
        for col_tuple in monthly_stats.columns:
            col_name = f"{col_tuple[0]}_{col_tuple[1]}"
            monthly_flattened[col_name] = monthly_stats[col_tuple].to_dict()
        analysis["monthly"] = monthly_flattened

        # Service level adoption by time
        service_trends = (
            pd.crosstab(self.df["month"], self.df["service_level"], normalize="index")
            * 100
        )
        analysis["service_trends"] = service_trends.round(1).to_dict()

        return analysis

    def geographic_intelligence(self):
        """Analyze geographic shipping patterns."""
        analysis = {}

        # Zone-to-zone flow analysis
        flow_matrix = pd.crosstab(self.df["origin_zone"], self.df["dest_zone"])
        analysis["flow_matrix"] = flow_matrix.to_dict()

        # Carrier dominance by zone
        zone_carriers = (
            pd.crosstab(self.df["dest_zone"], self.df["carrier"], normalize="index")
            * 100
        )
        analysis["carrier_dominance"] = zone_carriers.round(1).to_dict()

        # Distance vs performance
        self.df["zone_distance"] = abs(self.df["dest_zone"] - self.df["origin_zone"])
        distance_performance = (
            self.df.groupby("zone_distance")
            .agg(
                {
                    "transit_time_days": ["mean", "std"],
                    "shipping_cost_usd": ["mean", "std"],
                    "carrier": "count",
                }
            )
            .round(2)
        )

        # Flatten MultiIndex columns for distance performance
        distance_flattened = {}
        for col_tuple in distance_performance.columns:
            col_name = f"{col_tuple[0]}_{col_tuple[1]}"
            distance_flattened[col_name] = distance_performance[col_tuple].to_dict()
        analysis["distance_performance"] = distance_flattened

        return analysis

    def package_analytics(self):
        """Analyze package characteristics and their impact."""
        analysis = {}

        # Create package size categories
        self.df["package_category"] = pd.cut(
            self.df["package_volume_cubic_in"],
            bins=[0, 100, 500, 1000, float("inf")],
            labels=["Small", "Medium", "Large", "XLarge"],
        )

        # Package size impact on performance
        size_impact = (
            self.df.groupby("package_category")
            .agg(
                {
                    "transit_time_days": ["mean", "std"],
                    "shipping_cost_usd": ["mean", "std", "median"],
                    "carrier": "count",
                }
            )
            .round(2)
        )

        # Flatten MultiIndex columns for size impact
        size_flattened = {}
        for col_tuple in size_impact.columns:
            col_name = f"{col_tuple[0]}_{col_tuple[1]}"
            size_flattened[col_name] = size_impact[col_tuple].to_dict()
        analysis["size_impact"] = size_flattened

        # Weight vs cost relationship
        weight_bins = pd.cut(self.df["package_weight_lbs"], bins=10)
        weight_analysis = (
            self.df.groupby(weight_bins)
            .agg(
                {
                    "shipping_cost_usd": ["mean", "std"],
                    "transit_time_days": ["mean", "std"],
                }
            )
            .round(2)
        )

        # Flatten MultiIndex columns for weight analysis
        weight_flattened = {}
        for col_tuple in weight_analysis.columns:
            col_name = f"{col_tuple[0]}_{col_tuple[1]}"
            # Convert interval index to string for JSON serialization
            weight_dict = {}
            for interval, value in weight_analysis[col_tuple].items():
                try:
                    interval_str = f"{interval.left:.1f}-{interval.right:.1f}"
                except AttributeError:
                    interval_str = str(interval)
                weight_dict[interval_str] = value
            weight_flattened[col_name] = weight_dict
        analysis["weight_impact"] = weight_flattened

        # Insurance value analysis
        high_value = self.df[self.df["insurance_value"] > 500]
        regular_value = self.df[self.df["insurance_value"] <= 500]

        analysis["value_comparison"] = {
            "high_value": {
                "count": len(high_value),
                "avg_transit": high_value["transit_time_days"].mean(),
                "avg_cost": high_value["shipping_cost_usd"].mean(),
                "preferred_services": high_value["service_level"]
                .value_counts()
                .to_dict(),
            },
            "regular_value": {
                "count": len(regular_value),
                "avg_transit": regular_value["transit_time_days"].mean(),
                "avg_cost": regular_value["shipping_cost_usd"].mean(),
                "preferred_services": regular_value["service_level"]
                .value_counts()
                .to_dict(),
            },
        }

        return analysis

    def performance_benchmarking(self):
        """Comprehensive carrier and service performance analysis."""
        analysis = {}

        # Carrier performance scorecard
        carrier_scores = (
            self.df.groupby("carrier")
            .agg(
                {
                    "transit_time_days": ["mean", "std", "median"],
                    "shipping_cost_usd": ["mean", "std", "median"],
                    "service_level": "count",
                }
            )
            .round(2)
        )

        # Performance consistency (coefficient of variation)
        carrier_consistency = (
            self.df.groupby("carrier")["transit_time_days"]
            .apply(lambda x: x.std() / x.mean())
            .round(3)
        )

        # Flatten MultiIndex columns for carrier scores
        carrier_flattened = {}
        for col_tuple in carrier_scores.columns:
            col_name = f"{col_tuple[0]}_{col_tuple[1]}"
            carrier_flattened[col_name] = carrier_scores[col_tuple].to_dict()
        analysis["carrier_scores"] = carrier_flattened
        analysis["consistency_index"] = carrier_consistency.to_dict()

        # Service level effectiveness
        service_effectiveness = (
            self.df.groupby("service_level")
            .agg(
                {
                    "transit_time_days": ["mean", "std", "median"],
                    "shipping_cost_usd": ["mean", "std", "median"],
                }
            )
            .round(2)
        )

        # Flatten MultiIndex columns for service effectiveness
        service_flattened = {}
        for col_tuple in service_effectiveness.columns:
            col_name = f"{col_tuple[0]}_{col_tuple[1]}"
            service_flattened[col_name] = service_effectiveness[col_tuple].to_dict()
        analysis["service_effectiveness"] = service_flattened

        # Cost-performance correlation
        self.df["cost_per_day"] = (
            self.df["shipping_cost_usd"] / self.df["transit_time_days"]
        )
        cost_efficiency = (
            self.df.groupby(["carrier", "service_level"])["cost_per_day"]
            .mean()
            .round(2)
        )

        # Convert MultiIndex Series to nested dict for cost efficiency
        cost_efficiency_dict = {}
        for idx in cost_efficiency.index:
            carrier, service = idx
            if carrier not in cost_efficiency_dict:
                cost_efficiency_dict[carrier] = {}
            cost_efficiency_dict[carrier][service] = float(cost_efficiency.loc[idx])
        analysis["cost_efficiency"] = cost_efficiency_dict

        return analysis

    def customer_segmentation(self):
        """Segment customers based on shipping behavior."""
        try:
            # Create simplified customer profiles
            zone_stats = (
                self.df.groupby(["origin_zone", "dest_zone"])
                .agg(
                    {
                        "shipping_cost_usd": "mean",
                        "transit_time_days": "mean",
                        "package_weight_lbs": "mean",
                        "insurance_value": "mean",
                    }
                )
                .reset_index()
            )

            # Prepare features for clustering
            from sklearn.preprocessing import StandardScaler
            from sklearn.cluster import KMeans
            import numpy as np

            features = [
                "shipping_cost_usd",
                "transit_time_days",
                "package_weight_lbs",
                "insurance_value",
            ]
            scaler = StandardScaler()
            scaled_features = scaler.fit_transform(zone_stats[features])

            # K-means clustering
            kmeans = KMeans(n_clusters=4, random_state=42, n_init=10)
            zone_stats["segment"] = kmeans.fit_predict(scaled_features)

            # Segment summary
            segment_summary = (
                zone_stats.groupby("segment")
                .agg(
                    {
                        "shipping_cost_usd": "mean",
                        "transit_time_days": "mean",
                        "package_weight_lbs": "mean",
                        "insurance_value": "mean",
                        "origin_zone": "count",  # Count of zone pairs in each segment
                    }
                )
                .round(2)
            )

            return {
                "segment_summary": segment_summary.to_dict(),
                "total_zone_pairs": int(len(zone_stats)),
                "num_segments": int(len(segment_summary)),
                "cluster_info": {"features_used": features, "n_clusters": 4},
            }
        except Exception as e:
            return {"error": f"Segmentation error: {str(e)}"}

    def anomaly_detection(self):
        """Identify anomalies and outliers in shipping data."""
        analysis = {}

        # Statistical outliers using IQR method
        def find_outliers(series):
            Q1 = series.quantile(0.25)
            Q3 = series.quantile(0.75)
            IQR = Q3 - Q1
            lower_bound = Q1 - 1.5 * IQR
            upper_bound = Q3 + 1.5 * IQR
            return series[(series < lower_bound) | (series > upper_bound)]

        # Transit time outliers
        transit_outliers = find_outliers(self.df["transit_time_days"])
        analysis["transit_outliers"] = {
            "count": len(transit_outliers),
            "percentage": len(transit_outliers) / len(self.df) * 100,
            "examples": transit_outliers.head(10).to_list(),
        }

        # Cost outliers
        cost_outliers = find_outliers(self.df["shipping_cost_usd"])
        analysis["cost_outliers"] = {
            "count": len(cost_outliers),
            "percentage": len(cost_outliers) / len(self.df) * 100,
            "examples": cost_outliers.head(10).to_list(),
        }

        # Unusual carrier-service combinations
        combo_counts = self.df.groupby(["carrier", "service_level"]).size()
        threshold = combo_counts.quantile(0.1)
        rare_combos = combo_counts[combo_counts < threshold]
        # Convert MultiIndex Series to nested dict for JSON serialization
        rare_combos_dict = {}
        for (carrier, service), count in rare_combos.items():
            if carrier not in rare_combos_dict:
                rare_combos_dict[carrier] = {}
            rare_combos_dict[carrier][service] = int(count)
        analysis["rare_combinations"] = rare_combos_dict

        return analysis

    def predictive_insights(self):
        """Generate predictive insights and recommendations."""
        analysis = {}

        # Capacity stress indicators
        daily_volumes = self.df.groupby("ship_date").size()
        threshold = daily_volumes.quantile(0.9)
        peak_days_mask = daily_volumes.gt(threshold)
        peak_days = daily_volumes[peak_days_mask]

        analysis["capacity_insights"] = {
            "avg_daily_volume": float(daily_volumes.mean()),
            "peak_threshold": float(threshold),
            "stress_days": len(peak_days),
            "peak_patterns": {},  # Simplified for now
        }

        # Service degradation indicators
        monthly_performance = self.df.groupby("month")["transit_time_days"].mean()
        performance_trend = np.polyfit(
            range(len(monthly_performance)), monthly_performance, 1
        )[0]

        analysis["performance_trends"] = {
            "monthly_performance": monthly_performance.to_dict(),
            "trend_slope": float(performance_trend),
            "degradation_risk": "High" if performance_trend > 0.1 else "Low",
        }

        # Cost optimization opportunities
        carrier_zone_costs = self.df.groupby(["carrier", "dest_zone"])[
            "shipping_cost_usd"
        ].mean()

        optimization_ops = []
        for zone in range(1, 10):
            zone_costs = carrier_zone_costs.xs(zone, level=1)
            cheapest = zone_costs.idxmin()
            most_expensive = zone_costs.idxmax()
            savings = zone_costs[most_expensive] - zone_costs[cheapest]

            optimization_ops.append(
                {
                    "zone": zone,
                    "cheapest_carrier": cheapest,
                    "most_expensive_carrier": most_expensive,
                    "potential_savings": round(savings, 2),
                }
            )

        analysis["optimization_opportunities"] = optimization_ops

        return analysis

    def generate_comprehensive_report(self):
        """Generate a comprehensive analytics report."""
        print("🚚 COMPREHENSIVE SHIPPING DATA ANALYTICS REPORT")
        print("=" * 60)

        # Temporal Analysis
        print("\n📅 TEMPORAL PATTERNS")
        temporal = self.temporal_patterns()
        print(
            "Top shipping days:",
            temporal["day_of_week"]["transit_time_days"]["count"]
            .sort_values(ascending=False)
            .head(3)
            .to_dict(),
        )

        # Geographic Intelligence
        print("\n🗺️  GEOGRAPHIC INTELLIGENCE")
        geo = self.geographic_intelligence()
        print(
            "Most common shipping distance:",
            geo["distance_performance"]["carrier"]["count"].idxmax(),
            "zones",
        )

        # Package Analytics
        print("\n📦 PACKAGE ANALYTICS")
        package = self.package_analytics()
        print(
            "High-value vs Regular shipments:",
            package["value_comparison"]["high_value"]["count"],
            "vs",
            package["value_comparison"]["regular_value"]["count"],
        )

        # Performance Benchmarking
        print("\n⚡ PERFORMANCE BENCHMARKING")
        perf = self.performance_benchmarking()
        fastest_carrier = perf["carrier_scores"]["transit_time_days"]["mean"].idxmin()
        print(f"Fastest carrier overall: {fastest_carrier}")

        # Customer Segmentation
        print("\n👥 CUSTOMER SEGMENTATION")
        segments = self.customer_segmentation()
        print(
            f"Identified {len(segments['segment_summary'])} distinct customer segments"
        )

        # Anomaly Detection
        print("\n🔍 ANOMALY DETECTION")
        anomalies = self.anomaly_detection()
        print(
            f"Transit time outliers: {anomalies['transit_outliers']['count']} ({anomalies['transit_outliers']['percentage']:.1f}%)"
        )

        # Predictive Insights
        print("\n🔮 PREDICTIVE INSIGHTS")
        insights = self.predictive_insights()
        print(
            f"Performance trend: {'Improving' if insights['performance_trends']['trend_slope'] < 0 else 'Declining'}"
        )
        print(f"Degradation risk: {insights['performance_trends']['degradation_risk']}")

        print("\n" + "=" * 60)
        print("Report generated successfully! 📊")

        return {
            "temporal": temporal,
            "geographic": geo,
            "package": package,
            "performance": perf,
            "segmentation": segments,
            "anomalies": anomalies,
            "insights": insights,
        }


def main():
    """Run comprehensive analytics."""
    analyzer = ShippingAnalytics()
    report = analyzer.generate_comprehensive_report()
    return report


if __name__ == "__main__":
    main()
