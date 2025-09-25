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
        else:
            return {"error": f"Unknown request type: {request_type}"}
    except Exception as e:
        return {"error": str(e)}


if __name__ == "__main__":
    if len(sys.argv) > 1:
        request_type = sys.argv[1]
        result = handle_request(request_type)
        print(json.dumps({"success": True, "data": result}))
    else:
        print(json.dumps({"success": False, "error": "No request type provided"}))
