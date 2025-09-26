import { useOutletContext, useSearchParams } from "react-router";
import type { LoaderFunction } from "react-router";
import { useLoaderData, useNavigate } from "react-router";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Select } from "~/components/ui/select";
import { Label } from "~/components/ui/label";
import { BlocksSpinner } from "~/components/ui/elite-spinner";

export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const percentile = url.searchParams.get("percentile") || "80";
  const method = url.searchParams.get("method") || "median";

  try {
    // Get percentile analysis data
    const params = new URLSearchParams();
    params.append("percentile", percentile);
    params.append("method", method);

    const percentileResponse = await fetch(`http://localhost:3000/analytics/percentile?${params.toString()}`);
    const percentileResult = await percentileResponse.json();

    // Get percentile-filtered zone-specific carrier summary data
    const carrierZoneParams = new URLSearchParams();
    carrierZoneParams.append("percentile", percentile);
    carrierZoneParams.append("method", method);
    const carrierZoneResponse = await fetch(`http://localhost:3000/analytics/carrier-zone-summary-percentile?${carrierZoneParams.toString()}`);
    const carrierZoneResult = await carrierZoneResponse.json();

    // Combine both datasets
    const combinedData: any = {};

    if (percentileResult.success && percentileResult.data) {
      combinedData.percentile = percentileResult.data;
    }

    if (carrierZoneResult.success && carrierZoneResult.data) {
      combinedData.carrier_zone_summary = carrierZoneResult.data;
    }

    // If we have carrier zone data, return it with optional percentile data
    if (combinedData.carrier_zone_summary) {
      return {
        success: true,
        data: combinedData,
        params: { percentile, method }
      };
    }

    // Fallback to aggregated carrier summary if zone-specific doesn't work
    const carrierResponse = await fetch("http://localhost:3000/analytics/carrier-summary");
    const carrierResult = await carrierResponse.json();

    if (carrierResult.success && carrierResult.data) {
      combinedData.carrier_summary = carrierResult.data;
      return {
        success: true,
        data: combinedData,
        params: { percentile, method }
      };
    }

    // Fallback to regular summary if carrier summary doesn't work
    const summaryResponse = await fetch("http://localhost:3000/analytics/summary");
    const summaryResult = await summaryResponse.json();

    if (summaryResult.success && summaryResult.data) {
      combinedData.summary = summaryResult.data;
    }

    return {
      success: true,
      data: combinedData,
      params: { percentile, method }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load comparison data",
      params: { percentile, method }
    };
  }
};

interface ContextType {
  data: any;
  formData: any;
  setFormData: any;
  isLoading: boolean;
}

export default function AnalyticsCompare() {
  const { data } = useOutletContext<ContextType>();
  const loaderData = useLoaderData<any>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Loading state for percentile analysis
  const [isPercentileLoading, setIsPercentileLoading] = useState(false);

  // Get current values from URL params or defaults
  const currentPercentile = searchParams.get("percentile") || "80";
  const currentMethod = searchParams.get("method") || "median";

  // Merge context data with loader data
  const mergedData = { ...data, ...loaderData?.data };
  const error = loaderData?.error;

  // Handle form input changes
  const handleInputChange = (field: string, value: string) => {
    // Set loading state when parameters change
    setIsPercentileLoading(true);

    const newParams = new URLSearchParams(searchParams);
    newParams.set(field, value);
    navigate(`/analytics/compare?${newParams.toString()}`, { replace: true });
  };

  // Reset loading state when new data loads
  useEffect(() => {
    setIsPercentileLoading(false);
  }, [loaderData]);

  // Removed collapsible functionality - now always showing all service levels

  // Helper function to restructure carrier summary data by service level for carrier comparison
  const restructureDataByServiceLevel = (data: any, method: string = 'median') => {
    if (!data) return null;

    // Check if we have zone-specific carrier data (new format with zone-specific stats)
    if (data.carrier_zone_summary) {
      const serviceComparisons: any = {};
      const serviceLevels = ['OVERNIGHT', 'EXPRESS', 'PRIORITY', 'STANDARD', 'ECONOMY'];
      const zones = [1, 2, 3, 4, 5, 6, 7, 8, 9];

      serviceLevels.forEach(serviceLevel => {
        serviceComparisons[serviceLevel] = {
          zones: {}
        };

        zones.forEach(zone => {
          const zoneName = `zone_${zone}`;
          serviceComparisons[serviceLevel].zones[zoneName] = {};

          // Extract zone-specific carrier data from carrier_zone_summary
          Object.entries(data.carrier_zone_summary).forEach(([key, stats]: [string, any]) => {
            // Parse carrier, service, and zone from the key (e.g., "USPS_OVERNIGHT_zone_1", "Amazon_Logistics_EXPRESS_zone_2")
            const parts = key.split('_');
            if (parts.length >= 3 && parts[parts.length - 1] === zone.toString() && parts[parts.length - 2] === 'zone') {
              // Extract zone and service level by working backwards
              const zoneNumber = parts[parts.length - 1];
              const service = parts[parts.length - 3]; // The part before "zone"

              // The carrier is everything before the service level and "_zone"
              const carrierParts = parts.slice(0, parts.length - 3);
              const carrier = carrierParts.join('_');

              if (service === serviceLevel && zoneNumber === zone.toString()) {
                // Use the selected method for primary comparison metric
                const primaryMetric = method === 'mean' ? (stats.avg_transit_time || 0) : (stats.median_transit_time || 0);

                serviceComparisons[serviceLevel].zones[zoneName][carrier] = {
                  mean: primaryMetric,  // Use selected method as the primary metric
                  std: stats.transit_time_std || 0,
                  lower_2sigma: Math.max(0, primaryMetric - 2 * (stats.transit_time_std || 0)),
                  upper_2sigma: primaryMetric + 2 * (stats.transit_time_std || 0),
                  total_shipments: stats.total_shipments || 0,
                  median: stats.median_transit_time || 0,
                  average: stats.avg_transit_time || 0,
                  method: method
                };
              }
            }
          });
        });
      });

      return serviceComparisons;
    }

    // Check if we have carrier_summary data (aggregated format with carrier-specific stats)
    if (data.carrier_summary) {
      const serviceComparisons: any = {};
      const serviceLevels = ['OVERNIGHT', 'EXPRESS', 'PRIORITY', 'STANDARD', 'ECONOMY'];
      const zones = [1, 2, 3, 4, 5, 6, 7, 8, 9];

      serviceLevels.forEach(serviceLevel => {
        serviceComparisons[serviceLevel] = {
          zones: {}
        };

        zones.forEach(zone => {
          const zoneName = `zone_${zone}`;
          serviceComparisons[serviceLevel].zones[zoneName] = {};

          // Extract carrier data from carrier_summary (aggregated across all zones)
          Object.entries(data.carrier_summary).forEach(([carrierServiceKey, stats]: [string, any]) => {
            // Parse carrier and service from the key (e.g., "USPS_OVERNIGHT", "Amazon_Logistics_EXPRESS")
            const parts = carrierServiceKey.split('_');

            // Find the service level by checking against known service levels
            const serviceLevels = ['OVERNIGHT', 'EXPRESS', 'PRIORITY', 'STANDARD', 'ECONOMY'];
            let service = '';
            let carrier = '';

            // Work backwards to find the service level
            for (let i = parts.length - 1; i >= 0; i--) {
              const potentialService = parts.slice(i).join('_');
              if (serviceLevels.includes(potentialService)) {
                service = potentialService;
                carrier = parts.slice(0, i).join('_');
                break;
              }
            }

            if (service === serviceLevel && carrier) {
              // Use the selected method for primary comparison metric
              const primaryMetric = method === 'mean' ? (stats.avg_transit_time || 0) : (stats.median_transit_time || 0);

              serviceComparisons[serviceLevel].zones[zoneName][carrier] = {
                mean: primaryMetric,  // Use selected method as the primary metric
                std: stats.transit_time_std || 0,
                lower_2sigma: Math.max(0, primaryMetric - 2 * (stats.transit_time_std || 0)),
                upper_2sigma: primaryMetric + 2 * (stats.transit_time_std || 0),
                total_shipments: stats.total_shipments || 0,
                median: stats.median_transit_time || 0,
                average: stats.avg_transit_time || 0,
                method: method
              };
            }
          });
        });
      });

      return serviceComparisons;
    }

    // Check if we have summary data (old format, service-level only)
    if (data.summary) {
      const serviceComparisons: any = {};
      const serviceLevels = ['OVERNIGHT', 'EXPRESS', 'PRIORITY', 'STANDARD', 'ECONOMY'];
      const zones = [1, 2, 3, 4, 5, 6, 7, 8, 9];

      serviceLevels.forEach(serviceLevel => {
        serviceComparisons[serviceLevel] = {
          zones: {}
        };

        zones.forEach(zone => {
          const zoneName = `zone_${zone}`;
          serviceComparisons[serviceLevel].zones[zoneName] = {};

          // Extract service-level data from summary (no carrier breakdown)
          if (data.summary[serviceLevel]) {
            const stats = data.summary[serviceLevel];
            serviceComparisons[serviceLevel].zones[zoneName]['USPS'] = {
              mean: stats.avg_transit_time || 0,
              std: stats.transit_time_std || 0,
              lower_2sigma: Math.max(0, (stats.avg_transit_time || 0) - 2 * (stats.transit_time_std || 0)),
              upper_2sigma: (stats.avg_transit_time || 0) + 2 * (stats.transit_time_std || 0),
              total_shipments: stats.total_shipments || 0
            };
          }
        });
      });

      return serviceComparisons;
    }

    // Fallback to old structure for compare_2sigma data (USPS only, zone-specific)
    if (data.compare_2sigma) {
      const serviceComparisons: any = {};
      const serviceLevels = ['OVERNIGHT', 'EXPRESS', 'PRIORITY', 'STANDARD', 'ECONOMY'];

      serviceLevels.forEach(serviceLevel => {
        serviceComparisons[serviceLevel] = {
          zones: {}
        };

        Object.entries(data.compare_2sigma).forEach(([zoneName, zoneData]: [string, any]) => {
          if (zoneData[serviceLevel]) {
            serviceComparisons[serviceLevel].zones[zoneName] = {
              USPS: zoneData[serviceLevel]
            };
          }
        });
      });

      return serviceComparisons;
    }

    return null;
  };

  const restructuredData = restructureDataByServiceLevel(mergedData, currentMethod);

  const hasMultiCarrierData = restructuredData && Object.values(restructuredData).some((serviceData: any) =>
    Object.values(serviceData.zones).some((zoneData: any) =>
      Object.keys(zoneData).length > 1 || Object.keys(zoneData).some(carrier => carrier !== 'USPS')
    )
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Service Level Comparison & Optimization ({currentPercentile}th percentile, {currentMethod})</CardTitle>
              <CardDescription>
                Compare service levels across zones using percentile analysis. Winners are determined by lowest {currentMethod} transit time within the {currentPercentile}th percentile.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Percentile Analysis Controls */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-3">
              Percentile Analysis Settings
              <div className={`transition-all duration-300 ease-in-out transform ${
                isPercentileLoading
                  ? 'opacity-100 scale-100 translate-x-0'
                  : 'opacity-0 scale-95 -translate-x-2 pointer-events-none'
              }`}>
                <BlocksSpinner size={16} />
              </div>
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="percentile">Percentile Threshold (%)</Label>
                <Select
                  value={currentPercentile}
                  onChange={(e) => handleInputChange("percentile", e.target.value)}
                  disabled={isPercentileLoading}
                  className={isPercentileLoading ? 'cursor-not-allowed' : ''}
                >
                  <option value="70">70%</option>
                  <option value="75">75%</option>
                  <option value="80">80%</option>
                  <option value="85">85%</option>
                  <option value="90">90%</option>
                  <option value="95">95%</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="method">Analysis Method</Label>
                <Select
                  value={currentMethod}
                  onChange={(e) => handleInputChange("method", e.target.value)}
                  disabled={isPercentileLoading}
                  className={isPercentileLoading ? 'cursor-not-allowed' : ''}
                >
                  <option value="median">Median</option>
                  <option value="mean">Mean</option>
                </Select>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md mb-4">
              <p className="text-red-600">Error: {error}</p>
            </div>
          )}

          {/* Percentile Analysis Results */}
          {/* {mergedData.percentile && (
            <div className="space-y-6 mb-8">
              <h3 className="text-xl font-semibold">Percentile Analysis Results</h3>
              <div className="grid gap-4">
                {Object.entries(mergedData.percentile).map(([zone, zoneData]: [string, any]) => (
                  <div key={zone} className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                    <h4 className="font-semibold text-lg mb-4">USPS {zone.replace('_', ' ')}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-4">
                      {Object.entries(zoneData).filter(([k]) => k !== 'winner').map(([service, stats]: [string, any]) => (
                        <div key={service} className="bg-white p-4 rounded-lg border shadow-sm">
                          <div className="font-semibold text-sm text-gray-900 mb-1">{service}</div>
                          <div className="text-lg font-bold text-blue-600 mb-1">
                            {stats.metric_value?.toFixed(2)} days
                          </div>
                          <div className="text-xs text-gray-500 space-y-1">
                            <div>Coverage: {stats.percentile_coverage?.toFixed(1)}%</div>
                            <div>Samples: {stats.records_in_percentile?.toLocaleString()}</div>
                            <div>{currentPercentile}th %ile: {stats.percentile_threshold?.toFixed(2)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {zoneData.winner && (
                      <div className="p-4 bg-green-100 border border-green-300 rounded-lg">
                        <span className="font-bold text-green-800 text-lg">
                          🏆 Optimal: {zoneData.winner.service_level}
                        </span>
                        <span className="text-green-700 text-sm ml-2">
                          ({zoneData.winner.metric_value?.toFixed(2)} days {currentMethod})
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )} */}

          {restructuredData && (
            <div className="space-y-8 relative">
              {Object.entries(restructuredData).map(([serviceLevel, serviceData]: [string, any]) => {
                const hasZoneData = Object.entries(serviceData.zones).some(([_, carriers]: [string, any]) =>
                  Object.keys(carriers).length > 0
                );

                // Skip service levels with no data
                if (!hasZoneData) return null;

                return (
                  <div key={serviceLevel} className="bg-gray-50 rounded-lg border border-gray-200 shadow-sm">
                    {/* Service Level Header */}
                    <div className="p-6 border-b border-gray-200 bg-white rounded-t-lg">
                      <h3 className="text-xl font-semibold text-gray-800">
                        {serviceLevel} Service Comparison
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {Object.entries(serviceData.zones).filter(([_, carriers]: [string, any]) =>
                          Object.keys(carriers).length > 0
                        ).length} zones with carrier data
                      </p>
                    </div>

                    {/* Winner Cards */}
                    <div className="px-6 pb-6 pt-4">
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                        {Object.entries(serviceData.zones).map(([zoneName, carriers]: [string, any]) => {
                          // Skip if no carriers have data for this zone
                          if (Object.keys(carriers).length === 0) return null;

                          // Sort carriers by transit time (lower is better) and get only the winner
                          const sortedCarriers = Object.entries(carriers)
                            .filter(([_, data]: [string, any]) => data && data.mean !== undefined)
                            .sort(([_a, dataA]: [string, any], [_b, dataB]: [string, any]) => dataA.mean - dataB.mean);

                          if (sortedCarriers.length === 0) return null;

                          const [winnerCarrier, winnerData] = sortedCarriers[0];

                          // Define carrier colors for winner using authentic brand colors
                          const getCarrierColor = (carrier: string) => {
                            const brandColors: { [key: string]: { border: string; bg: string; text: string; cardClass: string } } = {
                              'USPS': {
                                border: 'border-[#004c92]',
                                bg: 'bg-[#e6f2ff]',
                                text: 'text-[#004c92]',
                                cardClass: 'carrier-usps'
                              },
                              'UPS': {
                                border: 'border-[#8b4513]',
                                bg: 'bg-[#f5e6d3]',
                                text: 'text-[#8b4513]',
                                cardClass: 'carrier-ups'
                              },
                              'FedEx': {
                                border: 'border-[#4d148c]',
                                bg: 'bg-[#f0e6ff]',
                                text: 'text-[#4d148c]',
                                cardClass: 'carrier-fedex'
                              },
                              'DHL': {
                                border: 'border-red-600',
                                bg: 'bg-red-50',
                                text: 'text-red-700',
                                cardClass: 'carrier-dhl'
                              },
                              'Amazon_Logistics': {
                                border: 'border-orange-500',
                                bg: 'bg-orange-50',
                                text: 'text-orange-700',
                                cardClass: 'carrier-amazon'
                              },
                              'OnTrac': {
                                border: 'border-green-600',
                                bg: 'bg-green-50',
                                text: 'text-green-700',
                                cardClass: 'carrier-ontrac'
                              },
                              'LaserShip': {
                                border: 'border-pink-500',
                                bg: 'bg-pink-50',
                                text: 'text-pink-700',
                                cardClass: 'carrier-lasership'
                              },
                              'Regional_Express': {
                                border: 'border-indigo-500',
                                bg: 'bg-indigo-50',
                                text: 'text-indigo-700',
                                cardClass: 'carrier-regional'
                              }
                            };

                            return brandColors[carrier] || {
                              border: 'border-gray-500',
                              bg: 'bg-gray-50',
                              text: 'text-gray-700',
                              cardClass: 'carrier-default'
                            };
                          };

                          const colors = getCarrierColor(winnerCarrier);

                          return (
                            <div key={zoneName} className="relative">
                              <div className={`${colors.cardClass} bg-white p-2 rounded border-l-4 ${colors.border} ${colors.bg} relative min-h-[120px] transition-all duration-200 hover:shadow-md`}>
                                {/* Winner badge */}
                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-600 rounded-full flex items-center justify-center shadow-sm">
                                  <span className="text-white text-xs">🏆</span>
                                </div>

                                {/* Zone header */}
                                <div className="text-center mb-1">
                                  <div className="carrier-badge px-1 py-0.5 rounded text-xs font-semibold">
                                    {zoneName.replace('_', ' ')}
                                  </div>
                                </div>

                                {/* Carrier info */}
                                <div className="text-center mb-1">
                                  <div className="carrier-name font-medium text-xs truncate">
                                    {winnerCarrier.replace('_', ' ')}
                                  </div>
                                </div>

                                {/* Main metric */}
                                <div className="text-center">
                                  <div className="font-bold text-green-700 text-sm">
                                    {(winnerData as any).mean?.toFixed(1)}d
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {currentMethod}
                                  </div>

                                  {/* Stats - simplified */}
                                  <div className="flex justify-center gap-2 text-xs text-gray-600 mt-1 pt-1 border-t border-gray-200">
                                    <span>±{(winnerData as any).std?.toFixed(1)}d</span>
                                  </div>

                                  {/* Shipment count - simplified */}
                                  <div className="text-xs text-gray-500">
                                    {(winnerData as any).total_shipments > 1000
                                      ? `${((winnerData as any).total_shipments / 1000).toFixed(1)}k`
                                      : (winnerData as any).total_shipments} ships
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        }).filter(Boolean)}
                      </div>
                    </div>
                  </div>
                );
              }).filter(Boolean)}
            </div>
          )}

          {!restructuredData && !error && (
            <div className="text-center py-8 text-muted-foreground">
              Loading carrier comparison analysis...
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
