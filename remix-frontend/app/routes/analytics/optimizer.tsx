// This file redirects to the compare page where optimizer functionality now lives// This file is temporarily here to prevent build errorsimport { useOutletContext } from "react-router";



import { redirect } from "react-router";// The optimizer functionality has been moved to the compare pageimport { Form } from "react-router";

import type { LoaderFunction } from "react-router";

import type { ActionFunction } from "react-router";

export const loader: LoaderFunction = async () => {

  // Redirect to the compare page where optimizer functionality now livesimport { redirect } from "react-router";import { useActionData } from "react-router";

  throw redirect("/analytics/compare");

};import type { LoaderFunction } from "react-router";import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";



export default function OptimizeRedirect() {import { Button } from "~/components/ui/button";

  return null;

}export const loader: LoaderFunction = async () => {import { Select } from "~/components/ui/select";

  // Redirect to the compare page where optimizer functionality now livesimport { Label } from "~/components/ui/label";

  throw redirect("/analytics/compare");

};export const action: ActionFunction = async ({ request }) => {

  const formData = await request.formData();

export default function OptimizeRedirect() {  const analysisType = formData.get("analysis_type") as string;

  return null;

}  if (analysisType !== "percentile") {
    return { success: false, error: "Invalid analysis type" };
  }

  try {
    const percentile = formData.get("percentile") as string;
    const method = formData.get("method") as string;

    const params = new URLSearchParams();
    if (percentile) params.append("percentile", percentile);
    if (method) params.append("method", method);

    const url = `http://localhost:3000/analytics/percentile?${params.toString()}`;
    const response = await fetch(url);
    const result = await response.json();

    return {
      success: true,
      data: {
        percentile: result.success ? result.data : null
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to perform analysis"
    };
  }
};

interface ContextType {
  data: any;
  formData: any;
  setFormData: any;
  isLoading: boolean;
}

export default function AnalyticsOptimizer() {
  const { data, formData, setFormData, isLoading } = useOutletContext<ContextType>();
  const actionData = useActionData<any>();

  // Use action data if available, otherwise fall back to context data
  const displayData = actionData?.data || data;

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
          <Form method="post" action="/analytics/optimizer" className="space-y-4">
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

          {actionData?.error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-600">Error: {actionData.error}</p>
            </div>
          )}

          {displayData.percentile && (
            <div className="mt-6 space-y-4">
              <h3 className="text-lg font-semibold">
                Percentile Analysis Results ({formData.percentile}th percentile, {formData.method})
              </h3>
              {Object.entries(displayData.percentile).map(([zone, zoneData]: [string, any]) => (
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
