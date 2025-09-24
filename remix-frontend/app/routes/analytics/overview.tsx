import { useOutletContext } from "react-router";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

interface ContextType {
  data: any;
  formData: any;
  setFormData: any;
  isLoading: boolean;
}

export default function AnalyticsOverview() {
  const { data } = useOutletContext<ContextType>();

  // Prepare chart data for overview
  const overviewChartData = data.summary ? Object.entries(data.summary).map(([service, stats]: [string, any]) => ({
    service,
    avgTransitTime: stats.avg_transit_time,
    avgCost: stats.avg_cost,
    totalShipments: stats.total_shipments
  })) : [];

  return (
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
  );
}
