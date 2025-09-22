import type { ActionFunction } from "react-router";
import { Form, useActionData, useNavigation } from "react-router";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Select } from "~/components/ui/select";

export const meta = () => {
  return [
    { title: "Transit Time & Cost Prediction" },
    { name: "description", content: "Predict shipping transit time and cost using machine learning" },
  ];
};

interface PredictionResult {
  transit_time_days: number;
  shipping_cost_usd: number;
}

interface ActionData {
  success?: boolean;
  prediction?: PredictionResult;
  error?: string;
}

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  
  const data = {
    origin_zone: parseInt(formData.get("origin_zone") as string),
    dest_zone: parseInt(formData.get("dest_zone") as string),
    carrier: formData.get("carrier") as string,
    service_level: formData.get("service_level") as string,
    weight_lbs: parseFloat(formData.get("weight_lbs") as string),
    length_in: parseFloat(formData.get("length_in") as string),
    width_in: parseFloat(formData.get("width_in") as string),
    height_in: parseFloat(formData.get("height_in") as string),
    insurance_value: parseFloat(formData.get("insurance_value") as string),
  };

  try {
    const response = await fetch("http://localhost:3000/predict", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const prediction = await response.json();
    return { 
      success: true, 
      prediction: prediction.predictions // Extract the predictions object 
    };
  } catch (error) {
    console.error("Prediction error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to get prediction" 
    };
  }
};

export default function TransitPrediction() {
  const actionData = useActionData<ActionData>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const [formData, setFormData] = useState({
    origin_zone: "1",
    dest_zone: "5",
    carrier: "USPS",
    service_level: "Ground",
    weight_lbs: "2.5",
    length_in: "12",
    width_in: "8",
    height_in: "6",
    insurance_value: "100",
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Transit Time & Cost Prediction
          </h1>
          <p className="text-gray-600">
            Get accurate shipping estimates using machine learning
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Form */}
          <Card>
            <CardHeader>
              <CardTitle>Shipment Details</CardTitle>
              <CardDescription>
                Enter your package information to get predictions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form method="post" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="origin_zone">Origin Zone (1-9)</Label>
                    <Select
                      name="origin_zone"
                      value={formData.origin_zone}
                      onChange={(e) => handleInputChange("origin_zone", e.target.value)}
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(zone => (
                        <option key={zone} value={zone}>Zone {zone}</option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="dest_zone">Destination Zone (1-9)</Label>
                    <Select
                      name="dest_zone"
                      value={formData.dest_zone}
                      onChange={(e) => handleInputChange("dest_zone", e.target.value)}
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(zone => (
                        <option key={zone} value={zone}>Zone {zone}</option>
                      ))}
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="carrier">Carrier</Label>
                    <Select
                      name="carrier"
                      value={formData.carrier}
                      onChange={(e) => handleInputChange("carrier", e.target.value)}
                    >
                      <option value="USPS">USPS</option>
                      <option value="UPS">UPS</option>
                      <option value="FedEx">FedEx</option>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="service_level">Service Level</Label>
                    <Select
                      name="service_level"
                      value={formData.service_level}
                      onChange={(e) => handleInputChange("service_level", e.target.value)}
                    >
                      <option value="Ground">Ground</option>
                      <option value="Express">Express</option>
                      <option value="Priority">Priority</option>
                      <option value="Overnight">Overnight</option>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="weight_lbs">Weight (lbs)</Label>
                  <Input
                    type="number"
                    name="weight_lbs"
                    step="0.1"
                    min="0.1"
                    max="70"
                    value={formData.weight_lbs}
                    onChange={(e) => handleInputChange("weight_lbs", e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="length_in">Length (in)</Label>
                    <Input
                      type="number"
                      name="length_in"
                      step="0.1"
                      min="1"
                      max="108"
                      value={formData.length_in}
                      onChange={(e) => handleInputChange("length_in", e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="width_in">Width (in)</Label>
                    <Input
                      type="number"
                      name="width_in"
                      step="0.1"
                      min="1"
                      max="108"
                      value={formData.width_in}
                      onChange={(e) => handleInputChange("width_in", e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="height_in">Height (in)</Label>
                    <Input
                      type="number"
                      name="height_in"
                      step="0.1"
                      min="1"
                      max="108"
                      value={formData.height_in}
                      onChange={(e) => handleInputChange("height_in", e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="insurance_value">Insurance Value ($)</Label>
                  <Input
                    type="number"
                    name="insurance_value"
                    step="0.01"
                    min="0"
                    max="5000"
                    value={formData.insurance_value}
                    onChange={(e) => handleInputChange("insurance_value", e.target.value)}
                    required
                  />
                </div>

                <Button type="submit" disabled={isSubmitting} className="w-full">
                  {isSubmitting ? "Predicting..." : "Get Prediction"}
                </Button>
              </Form>
            </CardContent>
          </Card>

          {/* Results */}
          <Card>
            <CardHeader>
              <CardTitle>Prediction Results</CardTitle>
              <CardDescription>
                Machine learning estimates for your shipment
              </CardDescription>
            </CardHeader>
            <CardContent>
              {actionData?.error && (
                <div className="text-red-600 bg-red-50 p-4 rounded-md mb-4">
                  <h3 className="font-medium">Error</h3>
                  <p className="text-sm">{actionData.error}</p>
                </div>
              )}

              {actionData?.success && actionData.prediction && (
                <div className="space-y-6">
                  <div className="bg-blue-50 p-4 rounded-md">
                    <h3 className="font-medium text-blue-900 mb-2">Transit Time</h3>
                    <div className="text-2xl font-bold text-blue-700">
                      {actionData.prediction.transit_time_days.toFixed(1)} days
                    </div>
                  </div>

                  <div className="bg-green-50 p-4 rounded-md">
                    <h3 className="font-medium text-green-900 mb-2">Shipping Cost</h3>
                    <div className="text-2xl font-bold text-green-700">
                      ${actionData.prediction.shipping_cost_usd.toFixed(2)}
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 mt-4">
                    Predictions are based on historical shipping data and machine learning models.
                    Actual results may vary.
                  </div>
                </div>
              )}

              {!actionData && (
                <div className="text-center text-gray-500 py-8">
                  Enter shipment details and click "Get Prediction" to see results
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}