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
            data_path = Path(__file__).parent / 'statistical_shipping_data.parquet'
        
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
            metadata_path = self.data_path.parent / 'distribution_metadata.json'
            with open(metadata_path, 'r') as f:
                self.metadata = json.load(f)
            
            print(f"Loaded {len(self.df):,} shipping records", file=sys.stderr)
            
        except Exception as e:
            print(f"Error loading data: {e}", file=sys.stderr)
            raise
    
    def get_distribution_stats(self, service_level: str, zone: int, metric: str = 'transit_time_days') -> Dict:
        """Get detailed distribution statistics for a service level and zone."""
        data = self.df[
            (self.df['service_level'] == service_level) & 
            (self.df['dest_zone'] == zone)
        ][metric]
        
        if len(data) == 0:
            return None
        
        # Calculate comprehensive statistics
        stats_dict = {
            'count': int(len(data)),
            'mean': float(data.mean()),
            'median': float(data.median()),
            'std': float(data.std()),
            'var': float(data.var()),
            'min': float(data.min()),
            'max': float(data.max()),
            'q25': float(data.quantile(0.25)),
            'q75': float(data.quantile(0.75)),
            'iqr': float(data.quantile(0.75) - data.quantile(0.25)),
            'skewness': float(stats.skew(data)),
            'kurtosis': float(stats.kurtosis(data)),
            'percentiles': {
                'p10': float(data.quantile(0.10)),
                'p20': float(data.quantile(0.20)),
                'p30': float(data.quantile(0.30)),
                'p40': float(data.quantile(0.40)),
                'p50': float(data.quantile(0.50)),
                'p60': float(data.quantile(0.60)),
                'p70': float(data.quantile(0.70)),
                'p80': float(data.quantile(0.80)),
                'p90': float(data.quantile(0.90)),
                'p95': float(data.quantile(0.95)),
                'p99': float(data.quantile(0.99))
            }
        }
        
        # Normal distribution test
        shapiro_stat, shapiro_p = stats.shapiro(data.sample(min(5000, len(data))))
        stats_dict['normality_test'] = {
            'shapiro_wilk_statistic': float(shapiro_stat),
            'shapiro_wilk_p_value': float(shapiro_p),
            'is_normal_p05': shapiro_p > 0.05
        }
        
        return stats_dict
    
    def get_all_distributions(self) -> Dict:
        """Get distribution statistics for all service levels and zones."""
        distributions = {}
        
        for service in self.metadata['service_levels']:
            distributions[service] = {}
            
            for zone in self.metadata['usps_zones']:
                zone_key = f'zone_{zone}'
                distributions[service][zone_key] = {
                    'transit_time': self.get_distribution_stats(service, zone, 'transit_time_days'),
                    'shipping_cost': self.get_distribution_stats(service, zone, 'shipping_cost_usd')
                }
        
        return distributions
    
    def compare_service_levels_2sigma(self, zones: List[int] = None) -> Dict:
        """Compare service levels using 2-sigma confidence intervals."""
        if zones is None:
            zones = self.metadata['usps_zones']
        
        results = {}
        
        for zone in zones:
            zone_results = {}
            
            for service in self.metadata['service_levels']:
                data = self.df[
                    (self.df['service_level'] == service) & 
                    (self.df['dest_zone'] == zone)
                ]['transit_time_days']
                
                if len(data) > 0:
                    mean = data.mean()
                    std = data.std()
                    
                    zone_results[service] = {
                        'mean': float(mean),
                        'std': float(std),
                        'lower_2sigma': float(mean - 2 * std),
                        'upper_2sigma': float(mean + 2 * std),
                        'range_2sigma': float(4 * std),
                        'confidence_interval_95': [
                            float(mean - 1.96 * std / np.sqrt(len(data))),
                            float(mean + 1.96 * std / np.sqrt(len(data)))
                        ]
                    }
            
            # Find the winner (lowest upper bound at 2-sigma)
            if zone_results:
                winner = min(zone_results.keys(), 
                           key=lambda x: zone_results[x]['upper_2sigma'])
                zone_results['winner'] = {
                    'service_level': winner,
                    'reason': 'lowest_2sigma_upper_bound',
                    'transit_time_upper': zone_results[winner]['upper_2sigma']
                }
            
            results[f'zone_{zone}'] = zone_results
        
        return results
    
    def find_best_service_by_percentile(self, percentile: float, zones: List[int] = None, 
                                      method: str = 'median') -> Dict:
        """Find best service level based on percentile threshold."""
        if zones is None:
            zones = self.metadata['usps_zones']
        
        results = {}
        
        for zone in zones:
            zone_results = {}
            
            for service in self.metadata['service_levels']:
                data = self.df[
                    (self.df['service_level'] == service) & 
                    (self.df['dest_zone'] == zone)
                ]['transit_time_days']
                
                if len(data) > 0:
                    # Get data within percentile threshold
                    threshold_value = data.quantile(percentile / 100)
                    filtered_data = data[data <= threshold_value]
                    
                    if len(filtered_data) > 0:
                        if method == 'median':
                            metric_value = filtered_data.median()
                        else:  # mean
                            metric_value = filtered_data.mean()
                        
                        zone_results[service] = {
                            'metric_value': float(metric_value),
                            'percentile_threshold': float(threshold_value),
                            'records_in_percentile': int(len(filtered_data)),
                            'total_records': int(len(data)),
                            'percentile_coverage': float(len(filtered_data) / len(data) * 100),
                            'method': method
                        }
            
            # Find the winner (lowest metric value)
            if zone_results:
                winner = min(zone_results.keys(), 
                           key=lambda x: zone_results[x]['metric_value'])
                zone_results['winner'] = {
                    'service_level': winner,
                    'reason': f'lowest_{method}_in_{percentile}th_percentile',
                    'metric_value': zone_results[winner]['metric_value']
                }
            
            results[f'zone_{zone}'] = zone_results
        
        return results
    
    def get_histogram_data(self, service_level: str, zone: int, 
                          metric: str = 'transit_time_days', bins: int = 30) -> Dict:
        """Get histogram data for charting."""
        data = self.df[
            (self.df['service_level'] == service_level) & 
            (self.df['dest_zone'] == zone)
        ][metric]
        
        if len(data) == 0:
            return None
        
        hist, bin_edges = np.histogram(data, bins=bins)
        bin_centers = (bin_edges[:-1] + bin_edges[1:]) / 2
        
        return {
            'bins': bin_centers.tolist(),
            'counts': hist.tolist(),
            'total_count': int(len(data)),
            'bin_width': float(bin_edges[1] - bin_edges[0])
        }
    
    def get_service_level_summary(self) -> Dict:
        """Get summary statistics for all service levels."""
        summary = {}
        
        for service in self.metadata['service_levels']:
            service_data = self.df[self.df['service_level'] == service]
            
            summary[service] = {
                'total_shipments': int(len(service_data)),
                'avg_transit_time': float(service_data['transit_time_days'].mean()),
                'avg_cost': float(service_data['shipping_cost_usd'].mean()),
                'transit_time_std': float(service_data['transit_time_days'].std()),
                'cost_std': float(service_data['shipping_cost_usd'].std()),
                'zones_served': sorted(service_data['dest_zone'].unique().tolist())
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