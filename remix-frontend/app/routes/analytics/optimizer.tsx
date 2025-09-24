import { useOutletContext } from "react-router";
import { Form } from "react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Select } from "~/components/ui/select";
import { Label } from "~/components/ui/label";

interface ContextType {
  data: any;
  formData: any;
  setFormData: any;
  isLoading: boolean;
}

export default function AnalyticsOptimizer() {
  const { data, formData, setFormData, isLoading } = useOutletContext<ContextType>();

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Percentile-Based Service Optimizer</CardTitle>
          <CardDescription>
            Find the best service level based on percentile thresholds
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form method="post" action="/analytics" className="space-y-4">
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

            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Optimizing..." : "Find Optimal Service Levels"}
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
  );
}
