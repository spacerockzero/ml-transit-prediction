import type { ActionFunction, LoaderFunction } from "react-router";
import { Form, useActionData, useLoaderData, useNavigation } from "react-router";
import { useState, useEffect } from "react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, ComposedChart, Area, AreaChart
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Select } from "~/components/ui/select";
import { Label } from "~/components/ui/label";

export const meta = () => {
  return [
    { title: "Transit Time Analytics" },
    { name: "description", content: "Statistical analysis and comparison of shipping service levels" },
  ];
};

interface AnalyticsData {
  summary?: any;
  distributions?: any;
  compare_2sigma?: any;
  percentile?: any;
  histogram?: any;
}

interface ActionData {
  success?: boolean;
  data?: AnalyticsData;
  error?: string;
}

export const loader: LoaderFunction = async () => {
  try {
    // Load initial summary data
    const response = await fetch("http://localhost:3000/analytics/summary");
    const summaryResult = await response.json();
    
    return {
      success: true,
      data: {
        summary: summaryResult.success ? summaryResult.data : null
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load analytics data"
    };
  }
};

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const analysisType = formData.get("analysis_type") as string;
  
  try {
    let url = "http://localhost:3000/analytics/";
    let params = new URLSearchParams();
    
    switch (analysisType) {
      case "compare_2sigma":
        url += "compare-2sigma";
        break;
      case "percentile":
        url += "percentile";
        const percentile = formData.get("percentile") as string;
        const method = formData.get("method") as string;
        if (percentile) params.append("percentile", percentile);
        if (method) params.append("method", method);
        break;
      case "histogram":
        url += "histogram";
        const service = formData.get("service_level") as string;
        const zone = formData.get("zone") as string;
        const metric = formData.get("metric") as string;
        if (service) params.append("service_level", service);
        if (zone) params.append("zone", zone);
        if (metric) params.append("metric", metric);
        break;
      default:
        return { success: false, error: "Invalid analysis type" };
    }
    
    if (params.toString()) {
      url += "?" + params.toString();
    }
    
    const response = await fetch(url);
    const result = await response.json();
    
    return {
      success: true,
      data: {
        [analysisType]: result.success ? result.data : null
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to perform analysis"
    };
  }
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];
const SERVICE_LEVELS = ['OVERNIGHT', 'EXPRESS', 'PRIORITY', 'STANDARD', 'ECONOMY'];
const ZONES = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export default function Analytics() {
  const loaderData = useLoaderData<ActionData>();
  const actionData = useActionData<ActionData>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  
  const [selectedTab, setSelectedTab] = useState("overview");
  const [formData, setFormData] = useState({
    analysis_type: "compare_2sigma",
    percentile: "80",
    method: "median",
    service_level: "EXPRESS",
    zone: "5",
    metric: "transit_time_days"
  });
  
  const data = actionData?.data || loaderData?.data || {};
  
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  // Prepare chart data for overview
  const overviewChartData = data.summary ? Object.entries(data.summary).map(([service, stats]: [string, any]) => ({
    service,
    avgTransitTime: stats.avg_transit_time,
    avgCost: stats.avg_cost,
    totalShipments: stats.total_shipments
  })) : [];
  
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Transit Time Analytics Dashboard
          </h1>
          <p className="text-gray-600">
            Statistical analysis and optimization of shipping service levels
          </p>
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex space-x-1 mb-8 bg-gray-100 p-1 rounded-lg">
          {[
            { id: "overview", label: "Overview" },
            { id: "compare", label: "Service Comparison" },
            { id: "distributions", label: "Distributions" },
            { id: "optimizer", label: "Service Optimizer" }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id)}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                selectedTab === tab.id
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        
        {/* Overview Tab */}
        {selectedTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Average Transit Time by Service Level</CardTitle>
                  <CardDescription>Days to delivery across all zones</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={overviewChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="service" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="avgTransitTime" fill="#3B82F6" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Average Shipping Cost by Service Level</CardTitle>
                  <CardDescription>USD cost across all zones</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={overviewChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="service" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="avgCost" fill="#10B981" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Shipment Volume Distribution</CardTitle>
                <CardDescription>Total shipments processed by service level</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={overviewChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ service, percent }: any) => `${service} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="totalShipments"
                    >
                      {overviewChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* Service Comparison Tab */}
        {selectedTab === "compare" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Statistical Service Comparison</CardTitle>
                <CardDescription>
                  Compare service levels using advanced statistical methods
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form method="post" className="space-y-4">
                  <input type="hidden" name="analysis_type" value="compare_2sigma" />
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Analyzing..." : "Run 2-Sigma Analysis"}
                  </Button>
                </Form>
                
                {data.compare_2sigma && (
                  <div className="mt-6 space-y-4">
                    <h3 className="text-lg font-semibold">2-Sigma Confidence Analysis Results</h3>
                    {Object.entries(data.compare_2sigma).map(([zone, zoneData]: [string, any]) => (
                      <div key={zone} className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium mb-2">USPS {zone.replace('_', ' ')}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {Object.entries(zoneData).filter(([k]) => k !== 'winner').map(([service, stats]: [string, any]) => (
                            <div key={service} className="bg-white p-3 rounded border">
                              <div className="font-medium text-sm">{service}</div>
                              <div className="text-xs text-gray-600">
                                Mean: {stats.mean?.toFixed(2)} ± {stats.std?.toFixed(2)} days
                              </div>
                              <div className="text-xs text-gray-600">
                                2σ Range: {stats.lower_2sigma?.toFixed(2)} - {stats.upper_2sigma?.toFixed(2)}
                              </div>
                            </div>
                          ))}
                        </div>
                        {zoneData.winner && (
                          <div className="mt-2 p-2 bg-green-100 border border-green-300 rounded">
                            <span className="font-medium text-green-800">
                              Winner: {zoneData.winner.service_level}
                            </span>
                            <span className="text-green-600 text-sm ml-2">
                              (Lowest 2σ upper bound: {zoneData.winner.transit_time_upper?.toFixed(2)} days)
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* Service Optimizer Tab */}
        {selectedTab === "optimizer" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Percentile-Based Service Optimizer</CardTitle>
                <CardDescription>
                  Find the best service level based on percentile thresholds
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form method="post" className="space-y-4">
                  <input type="hidden" name="analysis_type" value="percentile" />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="percentile">Percentile Threshold (%)</Label>
                      <Select
                        name="percentile"
                        value={formData.percentile}
                        onChange={(e) => handleInputChange("percentile", e.target.value)}
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
                        name="method"
                        value={formData.method}
                        onChange={(e) => handleInputChange("method", e.target.value)}
                      >
                        <option value="median">Median</option>
                        <option value="mean">Mean</option>
                      </Select>
                    </div>
                  </div>
                  
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Optimizing..." : "Find Optimal Service Levels"}
                  </Button>
                </Form>
                
                {data.percentile && (
                  <div className="mt-6 space-y-4">
                    <h3 className="text-lg font-semibold">
                      Percentile Analysis Results ({formData.percentile}th percentile, {formData.method})
                    </h3>
                    {Object.entries(data.percentile).map(([zone, zoneData]: [string, any]) => (
                      <div key={zone} className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium mb-2">USPS {zone.replace('_', ' ')}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {Object.entries(zoneData).filter(([k]) => k !== 'winner').map(([service, stats]: [string, any]) => (
                            <div key={service} className="bg-white p-3 rounded border">
                              <div className="font-medium text-sm">{service}</div>
                              <div className="text-xs text-gray-600">
                                {formData.method}: {stats.metric_value?.toFixed(2)} days
                              </div>
                              <div className="text-xs text-gray-600">
                                Coverage: {stats.percentile_coverage?.toFixed(1)}%
                              </div>
                            </div>
                          ))}
                        </div>
                        {zoneData.winner && (
                          <div className="mt-2 p-2 bg-blue-100 border border-blue-300 rounded">
                            <span className="font-medium text-blue-800">
                              Optimal: {zoneData.winner.service_level}
                            </span>
                            <span className="text-blue-600 text-sm ml-2">
                              ({zoneData.winner.metric_value?.toFixed(2)} days {formData.method})
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* Distributions Tab */}
        {selectedTab === "distributions" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Transit Time Distribution Analysis</CardTitle>
                <CardDescription>
                  View histogram distributions for specific service levels and zones
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form method="post" className="space-y-4">
                  <input type="hidden" name="analysis_type" value="histogram" />
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="service_level">Service Level</Label>
                      <Select
                        name="service_level"
                        value={formData.service_level}
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
                        name="zone"
                        value={formData.zone}
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
                        name="metric"
                        value={formData.metric}
                        onChange={(e) => handleInputChange("metric", e.target.value)}
                      >
                        <option value="transit_time_days">Transit Time</option>
                        <option value="shipping_cost_usd">Shipping Cost</option>
                      </Select>
                    </div>
                  </div>
                  
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Loading..." : "Generate Distribution Chart"}
                  </Button>
                </Form>
                
                {data.histogram && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-4">
                      Distribution: {formData.service_level} - Zone {formData.zone}
                    </h3>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={data.histogram.bins?.map((bin: number, index: number) => ({
                        bin: bin.toFixed(1),
                        count: data.histogram.counts[index]
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="bin" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#8884D8" />
                      </BarChart>
                    </ResponsiveContainer>
                    <p className="text-sm text-gray-600 mt-2">
                      Total samples: {data.histogram.total_count?.toLocaleString()}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
        
        {(loaderData?.error || actionData?.error) && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600">{loaderData?.error || actionData?.error}</p>
          </div>
        )}
      </div>
    </div>
  );
}