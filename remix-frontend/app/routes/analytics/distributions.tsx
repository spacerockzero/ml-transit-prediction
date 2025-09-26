import { useOutletContext, useSearchParams } from "react-router";
import type { LoaderFunction } from "react-router";
import { useLoaderData, useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Select } from "~/components/ui/select";
import { Label } from "~/components/ui/label";
import { BlocksSpinner } from "~/components/ui/elite-spinner";

const SERVICE_LEVELS = ['OVERNIGHT', 'EXPRESS', 'PRIORITY', 'STANDARD', 'ECONOMY'];
const ZONES = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const service_level = url.searchParams.get("service_level") || "EXPRESS";
  const zone = url.searchParams.get("zone") || "5";
  const metric = url.searchParams.get("metric") || "transit_time_days";

  try {
    const params = new URLSearchParams();
    params.append("service_level", service_level);
    params.append("zone", zone);
    params.append("metric", metric);

    const response = await fetch(`http://localhost:3000/analytics/histogram?${params.toString()}`);
    const result = await response.json();

    return {
      success: true,
      data: {
        histogram: result.success ? result.data : null
      },
      params: { service_level, zone, metric }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load distribution data",
      params: { service_level, zone, metric }
    };
  }
};

interface ContextType {
  data: any;
  formData: any;
  setFormData: any;
  isLoading: boolean;
}

export default function AnalyticsDistributions() {
  const { data } = useOutletContext<ContextType>();
  const loaderData = useLoaderData<any>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isDistributionLoading, setIsDistributionLoading] = useState(false);

  // Get current values from URL params or defaults
  const currentServiceLevel = searchParams.get("service_level") || "EXPRESS";
  const currentZone = searchParams.get("zone") || "5";
  const currentMetric = searchParams.get("metric") || "transit_time_days";

  // Reset loading state when data changes
  useEffect(() => {
    setIsDistributionLoading(false);
  }, [loaderData]);

  // Merge context data with loader data
  const mergedData = { ...data, ...loaderData?.data };
  const error = loaderData?.error;
  const histogram = mergedData.histogram || loaderData?.data?.histogram;

  const handleInputChange = (field: string, value: string) => {
    setIsDistributionLoading(true);
    const newParams = new URLSearchParams(searchParams);
    newParams.set(field, value);
    navigate(`/analytics/distributions?${newParams.toString()}`, { replace: true });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            Transit Time Distribution Analysis
            <div className={`transition-all duration-300 ease-in-out transform ${
              isDistributionLoading
                ? 'opacity-100 scale-100 translate-x-0'
                : 'opacity-0 scale-95 -translate-x-2 pointer-events-none'
            }`}>
              <BlocksSpinner size={16} />
            </div>
          </CardTitle>
          <CardDescription>
            View histogram distributions for specific service levels and zones
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div>
              <Label htmlFor="service_level">Service Level</Label>
              <Select
                value={currentServiceLevel}
                onChange={(e) => handleInputChange("service_level", e.target.value)}
              >
                {SERVICE_LEVELS.map(service => (
                  <option key={service} value={service}>{service}</option>
                ))}
              </Select>
            </div>

            <div>
              <Label htmlFor="zone">USPS Zone</Label>
              <Select
                value={currentZone}
                onChange={(e) => handleInputChange("zone", e.target.value)}
              >
                {ZONES.map(zone => (
                  <option key={zone} value={zone}>Zone {zone}</option>
                ))}
              </Select>
            </div>

            <div>
              <Label htmlFor="metric">Metric</Label>
              <Select
                value={currentMetric}
                onChange={(e) => handleInputChange("metric", e.target.value)}
              >
                <option value="transit_time_days">Transit Time</option>
                <option value="shipping_cost_usd">Shipping Cost</option>
              </Select>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md mb-4">
              <p className="text-red-600">Error: {error}</p>
            </div>
          )}

          {histogram && (
            <div>
              <h3 className="text-lg font-semibold mb-4">
                Distribution: {currentServiceLevel} - Zone {currentZone}
              </h3>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={histogram.bins?.map((bin: number, index: number) => ({
                  bin: bin.toFixed(1),
                  count: histogram.counts[index]
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="bin" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8884D8" />
                </BarChart>
              </ResponsiveContainer>
              <p className="text-sm text-gray-600 mt-2">
                Total samples: {histogram.total_count?.toLocaleString()}
              </p>
            </div>
          )}

          {!histogram && !error && (
            <div className="text-center py-8 text-muted-foreground">
              Loading distribution chart...
            </div>
          )}

          {/* Debug info */}
          {/* <div className="mt-4 p-2 bg-gray-100 text-xs">
            <details>
              <summary>Debug Data</summary>
              <pre>{JSON.stringify({ loaderData, mergedData, histogram }, null, 2)}</pre>
            </details>
          </div> */}
        </CardContent>
      </Card>
    </div>
  );
}
