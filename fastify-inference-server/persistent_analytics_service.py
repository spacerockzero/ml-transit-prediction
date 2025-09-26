#!/usr/bin/env python3
"""
Persistent Analytics Service
Runs as a persistent process to avoid startup overhead.
"""

import sys
import os
import json
import signal
import time
from threading import Lock

# Add the statistical_analysis directory to the path
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
statistical_dir = os.path.join(parent_dir, "statistical_analysis")
sys.path.append(statistical_dir)

from statistics_analyzer import ShippingStatisticsAnalyzer
from advanced_analytics import ShippingAnalytics


class PersistentAnalyticsService:
    """Persistent analytics service that keeps the analyzer loaded in memory."""

    def __init__(self):
        self.analyzer = None
        self.advanced_analyzer = None
        self.load_lock = Lock()
        self.loaded = False
        self._load_analyzers()

        # Performance tracking
        self.request_count = 0
        self.start_time = time.time()

        # Set up signal handlers for graceful shutdown
        signal.signal(signal.SIGTERM, self._signal_handler)
        signal.signal(signal.SIGINT, self._signal_handler)

        self._log(f"Persistent Analytics Service started (PID: {os.getpid()})")

    def _load_analyzers(self):
        """Load analyzers once and keep them in memory."""
        try:
            with self.load_lock:
                if not self.loaded:
                    self._log("Loading analyzers...")
                    load_start = time.time()

                    self.analyzer = ShippingStatisticsAnalyzer()
                    self.advanced_analyzer = ShippingAnalytics()

                    load_time = time.time() - load_start
                    self.loaded = True
                    self._log(f"Analyzers loaded in {load_time:.2f}s")
        except Exception as e:
            self._log(f"Error loading analyzers: {e}")
            sys.exit(1)

    def _log(self, message):
        """Log with timestamp."""
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] {message}", file=sys.stderr, flush=True)

    def _signal_handler(self, signum, frame):
        """Handle shutdown signals gracefully."""
        self._log(f"Received signal {signum}, shutting down...")
        uptime = time.time() - self.start_time
        self._log(f"Processed {self.request_count} requests in {uptime:.1f}s")
        sys.exit(0)

    def handle_request(self, request_data):
        """Handle a single analytics request."""
        try:
            request_start = time.time()
            request_type = request_data.get("type")
            params = request_data.get("params", [])
            request_id = request_data.get("id", "unknown")

            self.request_count += 1

            # Route to appropriate handler
            if request_type == "summary":
                result = self.analyzer.get_service_level_summary()
            elif request_type == "carrier_summary":
                result = self.analyzer.get_carrier_service_summary()
            elif request_type == "carrier_zone_summary":
                result = self.analyzer.get_carrier_zone_summary()
            elif request_type == "carrier_zone_summary_percentile":
                percentile = float(params[0]) if len(params) > 0 else 50.0
                method = params[1] if len(params) > 1 else "median"
                result = self.analyzer.get_carrier_zone_summary_percentile(
                    percentile, method
                )
            elif request_type == "temporal_patterns":
                result = self.advanced_analyzer.temporal_patterns()
            elif request_type == "geographic_intelligence":
                result = self.advanced_analyzer.geographic_intelligence()
            elif request_type == "package_analytics":
                result = self.advanced_analyzer.package_analytics()
            elif request_type == "performance_benchmarking":
                result = self.advanced_analyzer.performance_benchmarking()
            elif request_type == "customer_segmentation":
                result = self.advanced_analyzer.customer_segmentation()
            elif request_type == "anomaly_detection":
                result = self.advanced_analyzer.anomaly_detection()
            elif request_type == "predictive_insights":
                result = self.advanced_analyzer.predictive_insights()
            elif request_type == "comprehensive_report":
                result = self.advanced_analyzer.comprehensive_report()
            elif request_type == "distributions":
                query_params = params[0] if len(params) > 0 else {}
                result = self.analyzer.get_all_distributions()
            elif request_type == "compare_2sigma":
                query_params = params[0] if len(params) > 0 else {}
                result = self.analyzer.compare_service_levels_2sigma()
            elif request_type == "compare_carriers":
                query_params = params[0] if len(params) > 0 else {}
                result = self.analyzer.compare_carriers_by_zone()
            elif request_type == "percentile_analysis":
                query_params = params[0] if len(params) > 0 else {}
                percentile = float(query_params.get("percentile", 80))
                method = query_params.get("method", "median")
                result = self.analyzer.find_best_service_by_percentile(
                    percentile, method=method
                )
            elif request_type == "histogram":
                query_params = params[0] if len(params) > 0 else {}
                service_level = query_params.get("service_level", "PRIORITY")
                zone = int(query_params.get("zone", 5))
                metric = query_params.get("metric", "transit_time_days")
                bins = int(query_params.get("bins", 30))
                result = self.analyzer.get_histogram_data(
                    service_level, zone, metric, bins
                )
            else:
                raise ValueError(f"Unknown request type: {request_type}")

            # Calculate processing time
            processing_time = time.time() - request_start

            response = {
                "success": True,
                "data": result,
                "request_id": request_id,
                "processing_time_ms": round(processing_time * 1000, 2),
                "request_count": self.request_count,
            }

            # Log performance info
            self._log(
                f"Request {request_id} ({request_type}) processed in {processing_time*1000:.1f}ms"
            )

            return response

        except Exception as e:
            self._log(f"Error processing request {request_id}: {e}")
            return {"success": False, "error": str(e), "request_id": request_id}

    def run(self):
        """Main service loop - process requests from stdin."""
        self._log("Service ready - waiting for requests...")

        try:
            for line in sys.stdin:
                line = line.strip()
                if not line:
                    continue

                try:
                    request_data = json.loads(line)
                    response = self.handle_request(request_data)

                    # Send response to stdout
                    print(json.dumps(response), flush=True)

                except json.JSONDecodeError as e:
                    self._log(f"Invalid JSON received: {e}")
                    error_response = {"success": False, "error": f"Invalid JSON: {e}"}
                    print(json.dumps(error_response), flush=True)

        except KeyboardInterrupt:
            self._log("Service interrupted by user")
        except Exception as e:
            self._log(f"Unexpected error in main loop: {e}")
            sys.exit(1)


def main():
    """Start the persistent analytics service."""
    service = PersistentAnalyticsService()
    service.run()


if __name__ == "__main__":
    main()
