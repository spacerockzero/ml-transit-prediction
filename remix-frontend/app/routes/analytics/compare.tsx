import { useOutletContext } from "react-router";
import type { LoaderFunction } from "react-router";
import { useLoaderData } from "react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";

export const loader: LoaderFunction = async () => {
  try {
    // Get zone-specific carrier summary data
    const carrierZoneResponse = await fetch("http://localhost:3000/analytics/carrier-zone-summary");
    const carrierZoneResult = await carrierZoneResponse.json();

    if (carrierZoneResult.success && carrierZoneResult.data) {
      return {
        success: true,
        data: {
          carrier_zone_summary: carrierZoneResult.data
        }
      };
    }

    // Fallback to aggregated carrier summary if zone-specific doesn't work
    const carrierResponse = await fetch("http://localhost:3000/analytics/carrier-summary");
    const carrierResult = await carrierResponse.json();

    if (carrierResult.success && carrierResult.data) {
      return {
        success: true,
        data: {
          carrier_summary: carrierResult.data
        }
      };
    }

    // Fallback to regular summary if carrier summary doesn't work
    const summaryResponse = await fetch("http://localhost:3000/analytics/summary");
    const summaryResult = await summaryResponse.json();

    return {
      success: true,
      data: {
        summary: summaryResult.success ? summaryResult.data : null
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load comparison data"
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

  // Merge context data with loader data
  const mergedData = { ...data, ...loaderData?.data };
  const error = loaderData?.error;

  // Helper function to restructure carrier summary data by service level for carrier comparison
  const restructureDataByServiceLevel = (data: any) => {
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
            // Parse carrier, service, and zone from the key (e.g., "USPS_OVERNIGHT_zone_1", "FedEx_EXPRESS_zone_2")
            const parts = key.split('_');
            if (parts.length >= 3 && parts[parts.length - 1] === zone.toString() && parts[parts.length - 2] === 'zone') {
              const carrier = parts[0];
              // Service level is everything between carrier and "_zone_N"
              const serviceEndIndex = parts.length - 2;
              const service = parts.slice(1, serviceEndIndex).join('_');

              if (service === serviceLevel) {
                serviceComparisons[serviceLevel].zones[zoneName][carrier] = {
                  mean: stats.median_transit_time || 0,  // Use median instead of average
                  std: stats.transit_time_std || 0,
                  lower_2sigma: Math.max(0, (stats.median_transit_time || 0) - 2 * (stats.transit_time_std || 0)),
                  upper_2sigma: (stats.median_transit_time || 0) + 2 * (stats.transit_time_std || 0),
                  total_shipments: stats.total_shipments || 0,
                  median: stats.median_transit_time || 0,
                  average: stats.avg_transit_time || 0
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
            // Parse carrier and service from the key (e.g., "USPS_OVERNIGHT", "FedEx_EXPRESS")
            const parts = carrierServiceKey.split('_');
            const carrier = parts[0];
            const service = parts.slice(1).join('_'); // Handle service names with underscores

            if (service === serviceLevel) {
              serviceComparisons[serviceLevel].zones[zoneName][carrier] = {
                mean: stats.median_transit_time || 0,  // Use median instead of average
                std: stats.transit_time_std || 0,
                lower_2sigma: Math.max(0, (stats.median_transit_time || 0) - 2 * (stats.transit_time_std || 0)),
                upper_2sigma: (stats.median_transit_time || 0) + 2 * (stats.transit_time_std || 0),
                total_shipments: stats.total_shipments || 0,
                median: stats.median_transit_time || 0,
                average: stats.avg_transit_time || 0
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

  const restructuredData = restructureDataByServiceLevel(mergedData);
  const hasMultiCarrierData = restructuredData && Object.values(restructuredData).some((serviceData: any) =>
    Object.values(serviceData.zones).some((zoneData: any) =>
      Object.keys(zoneData).length > 1 || Object.keys(zoneData).some(carrier => carrier !== 'USPS')
    )
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Carrier Service Comparison (by Median)</CardTitle>
          <CardDescription>
            Compare equivalent service levels across different carriers ranked by median transit times. Winners are determined by lowest median delivery time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md mb-4">
              <p className="text-red-600">Error: {error}</p>
            </div>
          )}

          {restructuredData && (
            <div className="space-y-8">
              {Object.entries(restructuredData).map(([serviceLevel, serviceData]: [string, any]) => (
                <div key={serviceLevel} className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-xl font-semibold mb-4">{serviceLevel} Service Comparison</h3>

                  {Object.entries(serviceData.zones).map(([zoneName, carriers]: [string, any]) => {
                    // Skip if no carriers have data for this zone
                    if (Object.keys(carriers).length === 0) return null;

                    // Sort carriers by transit time (lower is better)
                    const sortedCarriers = Object.entries(carriers)
                      .filter(([_, data]: [string, any]) => data && data.mean !== undefined)
                      .sort(([_a, dataA]: [string, any], [_b, dataB]: [string, any]) => dataA.mean - dataB.mean);

                    const winner = sortedCarriers.length > 0 ? sortedCarriers[0][0] : null;

                    // Define carrier colors
                    const getCarrierColor = (carrier: string, isWinner: boolean) => {
                      const baseColors: { [key: string]: { border: string; bg: string; text: string; badge: string; winnerBadge?: string } } = {
                        'USPS': { border: 'border-blue-500', bg: 'bg-blue-50', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-800' },
                        'FedEx': { border: 'border-purple-500', bg: 'bg-purple-50', text: 'text-purple-700', badge: 'bg-purple-100 text-purple-800' },
                        'UPS': { border: 'border-yellow-600', bg: 'bg-yellow-50', text: 'text-yellow-800', badge: 'bg-yellow-100 text-yellow-800' },
                        'DHL': { border: 'border-red-500', bg: 'bg-red-50', text: 'text-red-700', badge: 'bg-red-100 text-red-800' },
                        'Amazon_Logistics': { border: 'border-orange-500', bg: 'bg-orange-50', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-800' },
                        'OnTrac': { border: 'border-green-500', bg: 'bg-green-50', text: 'text-green-700', badge: 'bg-green-100 text-green-800' },
                        'LaserShip': { border: 'border-pink-500', bg: 'bg-pink-50', text: 'text-pink-700', badge: 'bg-pink-100 text-pink-800' },
                        'Regional_Express': { border: 'border-indigo-500', bg: 'bg-indigo-50', text: 'text-indigo-700', badge: 'bg-indigo-100 text-indigo-800' }
                      };

                      const colors = baseColors[carrier] || { border: 'border-gray-500', bg: 'bg-gray-50', text: 'text-gray-700', badge: 'bg-gray-100 text-gray-800' };

                      if (isWinner) {
                        return {
                          ...colors,
                          bg: 'bg-green-100',
                          border: 'border-green-500 border-2',
                          winnerBadge: 'bg-green-500 text-white'
                        };
                      }

                      return colors;
                    };

                    return (
                      <div key={zoneName} className="mb-6">
                        <h4 className="font-medium mb-3 text-gray-700 flex items-center gap-2">
                          {zoneName.replace('_', ' ').toUpperCase()}
                          {winner && (
                            <span className="text-sm text-green-600 font-semibold">
                              🏆 Winner: {winner} ({(sortedCarriers[0][1] as any).mean.toFixed(2)} days median)
                            </span>
                          )}
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                          {sortedCarriers.map(([carrier, data]: [string, any], index) => {
                            const isWinner = carrier === winner;
                            const colors = getCarrierColor(carrier, isWinner);

                            return (
                              <div key={carrier} className={`bg-white p-4 rounded border-l-4 ${colors.border} ${colors.bg} relative`}>
                                {isWinner && (
                                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                                    <span className="text-white text-xs font-bold">1</span>
                                  </div>
                                )}

                                <div className="flex items-center justify-between mb-2">
                                  <span className={`font-semibold ${colors.text}`}>
                                    {carrier.replace('_', ' ')}
                                  </span>
                                  <div className="flex gap-1">
                                    {isWinner && (
                                      <span className={`text-xs px-2 py-1 rounded ${colors.winnerBadge || 'bg-green-500 text-white'}`}>
                                        Winner
                                      </span>
                                    )}
                                    <span className={`text-xs px-2 py-1 rounded ${colors.badge}`}>
                                      #{index + 1}
                                    </span>
                                  </div>
                                </div>

                                <div className="text-sm text-gray-600 space-y-1">
                                  <div className="font-medium">
                                    Median: {data.mean?.toFixed(2)} days
                                  </div>
                                  <div className="text-xs">
                                    Average: {data.average?.toFixed(2)} days
                                  </div>
                                  <div>
                                    Std Dev: ±{data.std?.toFixed(2)} days
                                  </div>
                                  <div className="text-xs">
                                    2σ Range: {data.lower_2sigma?.toFixed(2)} - {data.upper_2sigma?.toFixed(2)} days
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    Shipments: {data.total_shipments?.toLocaleString()}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
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
