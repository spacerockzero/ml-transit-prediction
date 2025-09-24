#!/usr/bin/env python3
"""
Analytics Wrapper for Fastify Server
Provides analytics endpoints for the shipping statistics.
"""

import json
import sys
import os
from pathlib import Path
from contextlib import redirect_stdout, redirect_stderr
from io import StringIO

# Add the statistical analysis directory to the path
sys.path.append(str(Path(__file__).parent.parent / "statistical_analysis"))

# Import with stdout/stderr suppressed to avoid print statements interfering with JSON output
with redirect_stdout(StringIO()), redirect_stderr(StringIO()):
    from statistics_analyzer import ShippingStatisticsAnalyzer


def handle_analytics_request(request_type, params=None):
    """Handle analytics requests from the Fastify server."""
    try:
        # Initialize the analyzer with output suppressed
        with redirect_stdout(StringIO()), redirect_stderr(StringIO()):
            analyzer = ShippingStatisticsAnalyzer()

        if request_type == "summary":
            result = analyzer.get_service_level_summary()
            return {"success": True, "data": result}

        elif request_type == "carrier_summary":
            result = analyzer.get_carrier_service_summary()
            return {"success": True, "data": result}

        elif request_type == "distributions":
            zone = params.get("zone") if params else None
            service = params.get("service_level") if params else None

            if zone and service:
                # Get specific distribution
                transit_stats = analyzer.get_distribution_stats(
                    service, zone, "transit_time_days"
                )
                cost_stats = analyzer.get_distribution_stats(
                    service, zone, "shipping_cost_usd"
                )

                result = {
                    "service_level": service,
                    "zone": zone,
                    "transit_time": transit_stats,
                    "shipping_cost": cost_stats,
                }
            else:
                # Get all distributions
                result = analyzer.get_all_distributions()

            return {"success": True, "data": result}

        elif request_type == "compare_2sigma":
            zones = params.get("zones") if params else None
            result = analyzer.compare_service_levels_2sigma(zones)

            return {"success": True, "data": result}

        elif request_type == "compare_carriers":
            zones = params.get("zones") if params else None
            metric = params.get("metric", "transit_time_days")
            result = analyzer.compare_carriers_by_zone(zones, metric)

            return {"success": True, "data": result}

        elif request_type == "percentile_analysis":
            percentile = params.get("percentile", 80)
            method = params.get("method", "median")
            zones = params.get("zones") if params else None

            result = analyzer.find_best_service_by_percentile(percentile, zones, method)

            return {"success": True, "data": result}

        elif request_type == "histogram":
            service = params.get("service_level")
            zone = params.get("zone")
            metric = params.get("metric", "transit_time_days")
            bins = params.get("bins", 30)

            if not service or not zone:
                return {
                    "success": False,
                    "error": "service_level and zone are required for histogram data",
                }

            result = analyzer.get_histogram_data(service, zone, metric, bins)

            if result is None:
                return {
                    "success": False,
                    "error": "No data found for the specified service level and zone",
                }

            return {"success": True, "data": result}

        else:
            return {"success": False, "error": f"Unknown request type: {request_type}"}

    except Exception as e:
        return {"success": False, "error": str(e)}


def main():
    """CLI interface for analytics wrapper."""
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "Request type required"}))
        return

    request_type = sys.argv[1]
    params = {}

    # Parse additional parameters
    if len(sys.argv) > 2:
        try:
            params = json.loads(sys.argv[2])
        except json.JSONDecodeError:
            print(json.dumps({"success": False, "error": "Invalid JSON parameters"}))
            return

    result = handle_analytics_request(request_type, params)
    print(json.dumps(result))


if __name__ == "__main__":
    main()
