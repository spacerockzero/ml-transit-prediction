#!/usr/bin/env python3
"""
Analytics wrapper for Fastify server
Provides advanced analytics and business intelligence endpoints.
"""

import sys
import os
import json

# Add the statistical_analysis directory to the path
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
statistical_dir = os.path.join(parent_dir, "statistical_analysis")
sys.path.append(statistical_dir)

from statistics_analyzer import ShippingStatisticsAnalyzer
from advanced_analytics import ShippingAnalytics


def handle_request(request_type, data=None):
    """Handle analytics requests."""
    try:
        analyzer = ShippingStatisticsAnalyzer()
        advanced_analyzer = ShippingAnalytics()

        if request_type == "summary":
            return analyzer.get_service_level_summary()
        elif request_type == "carrier_summary":
            return analyzer.get_carrier_service_summary()
        elif request_type == "carrier_zone_summary":
            return analyzer.get_carrier_zone_summary()
        elif request_type == "carrier_zone_summary_percentile":
            try:
                percentile = float(sys.argv[2]) if len(sys.argv) > 2 else 50.0
                method = sys.argv[3] if len(sys.argv) > 3 else "median"
                result = analyzer.get_carrier_zone_summary_percentile(
                    percentile, method
                )
                return result
            except Exception as e:
                raise
        elif request_type == "temporal_patterns":
            return advanced_analyzer.temporal_patterns()
        elif request_type == "geographic_intelligence":
            return advanced_analyzer.geographic_intelligence()
        elif request_type == "package_analytics":
            return advanced_analyzer.package_analytics()
        elif request_type == "performance_benchmarking":
            return advanced_analyzer.performance_benchmarking()
        elif request_type == "customer_segmentation":
            segments = advanced_analyzer.customer_segmentation()
            # Convert numpy arrays to lists for JSON serialization
            segments["cluster_centers"] = segments["cluster_centers"].tolist()
            return segments
        elif request_type == "anomaly_detection":
            return advanced_analyzer.anomaly_detection()
        elif request_type == "predictive_insights":
            return advanced_analyzer.predictive_insights()
        elif request_type == "comprehensive_report":
            return advanced_analyzer.generate_comprehensive_report()
        elif request_type == "histogram":
            # Extract parameters for histogram
            if data:
                service_level = data.get("service_level", "EXPRESS")
                zone = int(data.get("zone", 5))
                metric = data.get("metric", "transit_time_days")
                bins = int(data.get("bins", 30))
            else:
                service_level = "EXPRESS"
                zone = 5
                metric = "transit_time_days"
                bins = 30

            histogram_data = analyzer.get_histogram_data(
                service_level, zone, metric, bins
            )
            return (
                histogram_data
                if histogram_data
                else {"error": "No data found for the specified parameters"}
            )
        elif request_type == "percentile" or request_type == "percentile_analysis":
            # Extract parameters for percentile analysis
            if data:
                percentile = float(data.get("percentile", 80))
                method = data.get("method", "median")
                zones = data.get("zones", None)
            else:
                percentile = 80
                method = "median"
                zones = None

            return analyzer.find_best_service_by_percentile(percentile, zones, method)
        else:
            return {"error": f"Unknown request type: {request_type}"}
    except Exception as e:
        return {"error": str(e)}


if __name__ == "__main__":
    if len(sys.argv) > 1:
        request_type = sys.argv[1]
        # Parse parameters if provided
        data = None
        if len(sys.argv) > 2:
            try:
                data = json.loads(sys.argv[2])
            except json.JSONDecodeError:
                data = None

        result = handle_request(request_type, data)
        print(json.dumps({"success": True, "data": result}))
    else:
        print(json.dumps({"success": False, "error": "No request type provided"}))
