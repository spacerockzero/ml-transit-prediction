import type { ActionFunction } from "react-router";
import { Form, useActionData, useNavigation, useSubmit } from "react-router";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Select } from "~/components/ui/select";
import { DashboardLayout } from "~/components/DashboardLayout";
import { PredictionSkeleton } from "~/components/PredictionSkeleton";
import { useTrainingStats } from "~/hooks/useTrainingStats";

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
  predictions?: Array<{
    carrier: string;
    transit_time_days: number;
    shipping_cost_usd: number;
  }>;
  sortBy?: string;
  error?: string;
}

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();

  const sortBy = formData.get("sort_by") as string || "time";
  const baseData = {
    ship_date: formData.get("ship_date") as string,
    zone: parseInt(formData.get("zone") as string),
    service_level: formData.get("service_level") as string,
    package_weight_lbs: parseFloat(formData.get("weight_lbs") as string),
    package_length_in: parseFloat(formData.get("length_in") as string),
    package_width_in: parseFloat(formData.get("width_in") as string),
    package_height_in: parseFloat(formData.get("height_in") as string),
    insurance_value: parseFloat(formData.get("insurance_value") as string),
  };

  const carriers = ["USPS", "UPS", "FedEx"];

  try {
    const predictions = await Promise.all(
      carriers.map(async (carrier) => {
        const data = { ...baseData, carrier };

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
          carrier,
          ...prediction.predictions
        };
      })
    );

    // Sort predictions based on user selection
    const sortedPredictions = predictions.sort((a, b) => {
      if (sortBy === "cost") {
        return a.shipping_cost_usd - b.shipping_cost_usd;
      } else {
        return a.transit_time_days - b.transit_time_days;
      }
    });

    return {
      success: true,
      predictions: sortedPredictions,
      sortBy
    };
  } catch (error) {
    console.error("Prediction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get predictions"
    };
  }
};

export default function TransitPrediction() {
  const actionData = useActionData<ActionData>();
  const navigation = useNavigation();
  const submit = useSubmit();
  const isSubmitting = navigation.state === "submitting";

  // Get dynamic training metadata
  const { formatShipmentCount, formatDateRange, formatLastUpdated, isLoading: trainingLoading } = useTrainingStats();

  const [formData, setFormData] = useState({
    ship_date: new Date().toISOString().split('T')[0], // Today's date
    zone: "1",
    service_level: "Ground",
    weight_lbs: "2.5",
    length_in: "12",
    width_in: "8",
    height_in: "6",
    insurance_value: "0",
    sort_by: "time",
  });

  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [skeletonExiting, setSkeletonExiting] = useState(false);
  const [predictionsExiting, setPredictionsExiting] = useState(false);
  const [skeletonTimer, setSkeletonTimer] = useState<NodeJS.Timeout | null>(null);
  const [lastFormData, setLastFormData] = useState<string>("");
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [lastResultsKey, setLastResultsKey] = useState<string>("");

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Create a stable key based on form data to prevent unnecessary re-renders
  const formDataKey = JSON.stringify(formData);

  // Create a key for current results to detect when new results arrive
  const currentResultsKey = actionData?.success && actionData.predictions
    ? JSON.stringify(actionData.predictions) + actionData.sortBy
    : "";

  // Check if we have new results
  const hasNewResults = currentResultsKey !== lastResultsKey && currentResultsKey !== "";

  // Update last results key when we get new results
  useEffect(() => {
    if (hasNewResults) {
      setLastResultsKey(currentResultsKey);
    }
  }, [hasNewResults, currentResultsKey]);

  // Handle skeleton visibility - show immediately when submitting, hide when results arrive
  useEffect(() => {
    if (isSubmitting) {
      // If we have existing predictions, animate them out first
      if (actionData?.success && actionData.predictions && !predictionsExiting && !showSkeleton) {
        setPredictionsExiting(true);
        // Show skeleton after prediction cards exit (250ms)
        const timer = setTimeout(() => {
          setShowSkeleton(true);
          setPredictionsExiting(false);
          setSkeletonExiting(false);
        }, 250);
        setSkeletonTimer(timer);
      } else {
        // No existing predictions, show skeleton immediately
        setShowSkeleton(true);
        setSkeletonExiting(false);
        setPredictionsExiting(false);
      }
      // Clear any existing skeleton timer
      if (skeletonTimer) {
        clearTimeout(skeletonTimer);
        setSkeletonTimer(null);
      }
    } else if (actionData?.success && actionData.predictions) {
      // Start skeleton exit animation when new results arrive
      if (showSkeleton && !skeletonExiting) {
        setSkeletonExiting(true);
        setPredictionsExiting(false);
        // Hide skeleton after exit animation completes (250ms to match fadeOutRight duration)
        const timer = setTimeout(() => {
          setShowSkeleton(false);
          setSkeletonExiting(false);
        }, 250);
        setSkeletonTimer(timer);
      }
    }
  }, [isSubmitting, actionData, showSkeleton, skeletonExiting, predictionsExiting]);

  // Submit form automatically on mount and when form data changes (with proper debounce)
  useEffect(() => {
    // Clear existing timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // Set up new debounced submission
    const timer = setTimeout(() => {
      // Only submit if form data actually changed or it's initial load
      if (formDataKey !== lastFormData || isInitialLoad) {
        const formDataObj = new FormData();
        Object.entries(formData).forEach(([key, value]) => {
          formDataObj.append(key, value);
        });

        submit(formDataObj, { method: "post" });
        setIsInitialLoad(false);
        setLastFormData(formDataKey);
      }
    }, 500); // Increased debounce time to 500ms

    setDebounceTimer(timer);

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [formDataKey]); // Only depend on formDataKey

  return (
    <DashboardLayout
      title="Predictions"
      subtitle="Get accurate shipping estimates using machine learning"
    >
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Form */}
          <Card>
            <CardHeader>
              <CardTitle>Shipment Details</CardTitle>
              <CardDescription>
                Predictions update automatically as you modify the details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form className="space-y-4">
                <div>
                  <Label htmlFor="ship_date">Shipping Date</Label>
                  <Input
                    type="date"
                    name="ship_date"
                    value={formData.ship_date}
                    onChange={(e) => handleInputChange("ship_date", e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="zone">USPS Zone (1-9)</Label>
                  <Select
                    name="zone"
                    value={formData.zone}
                    onChange={(e) => handleInputChange("zone", e.target.value)}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(zone => (
                      <option key={zone} value={zone}>Zone {zone}</option>
                    ))}
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="sort_by">Sort Results By</Label>
                    <Select
                      name="sort_by"
                      value={formData.sort_by}
                      onChange={(e) => handleInputChange("sort_by", e.target.value)}
                    >
                      <option value="time">Transit Time</option>
                      <option value="cost">Cost</option>
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
              </Form>
            </CardContent>
          </Card>

          {/* Results */}
          <Card>
            <CardHeader>
                <CardTitle>iDrive AI Smart Transit Estimate<sup>™</sup></CardTitle>
              <CardDescription>
                Machine learning estimates for your shipment
              </CardDescription>
            </CardHeader>
            <CardContent>
              {actionData?.error && (
                <div className="text-red-600 bg-red-50 p-4 rounded-md mb-4 fade-in">
                  <h3 className="font-medium">Error</h3>
                  <p className="text-sm">{actionData.error}</p>
                </div>
              )}

              {showSkeleton && (
                <div className={`${skeletonExiting ? "skeleton-exit" : "skeleton-enter"}`}>
                  <PredictionSkeleton />
                </div>
              )}

              {predictionsExiting && actionData?.success && actionData.predictions && (
                <div className="space-y-4 predictions-exit" key={`${currentResultsKey}-exit`}>
                  <div className="mb-4">
                    <h3 className="font-medium text-gray-900 mb-2 prediction-value">
                      All Carriers - Sorted by {actionData.sortBy === 'time' ? 'Transit Time' : 'Cost'}
                    </h3>
                  </div>

                  {actionData.predictions.map((prediction, index) => (
                    <div
                      key={prediction.carrier}
                      className={`prediction-card bg-white border rounded-lg p-4 shadow-sm hover:transform hover:translateY-[-1px] hover:shadow-lg transition-all duration-150 ease-in-out carrier-${prediction.carrier.toLowerCase()}`}
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-gray-900 text-lg prediction-value carrier-name">
                          {prediction.carrier}
                        </h4>
                        {index === 0 && (
                          <span className="carrier-badge text-xs px-2 py-1 rounded-full prediction-value">
                            Best Option
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-blue-50 p-3 rounded-md">
                          <div className="text-xs text-blue-600 font-medium mb-1">Transit Time</div>
                          <div className="text-lg font-bold text-blue-700 prediction-value">
                            {prediction.transit_time_days.toFixed(1)} days
                          </div>
                        </div>

                        <div className="bg-green-50 p-3 rounded-md">
                          <div className="text-xs text-green-600 font-medium mb-1">Shipping Cost</div>
                          <div className="text-lg font-bold text-green-700 prediction-value">
                            ${prediction.shipping_cost_usd.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!showSkeleton && !isSubmitting && actionData?.success && actionData.predictions && !predictionsExiting && (
                <div className="space-y-4 fade-in" key={currentResultsKey}>
                  <div className="mb-4">
                    <h3 className="font-medium text-gray-900 mb-2 prediction-value">
                      All Carriers - Sorted by {actionData.sortBy === 'time' ? 'Transit Time' : 'Cost'}
                    </h3>
                  </div>

                  {actionData.predictions.map((prediction, index) => (
                    <div
                      key={prediction.carrier}
                      className={`prediction-card bg-white border rounded-lg p-4 shadow-sm hover:transform hover:translateY-[-1px] hover:shadow-lg transition-all duration-150 ease-in-out carrier-${prediction.carrier.toLowerCase()}`}
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-gray-900 text-lg prediction-value carrier-name">
                          {prediction.carrier}
                        </h4>
                        {index === 0 && (
                          <span className="carrier-badge text-xs px-2 py-1 rounded-full prediction-value">
                            Best Option
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-blue-50 p-3 rounded-md">
                          <div className="text-xs text-blue-600 font-medium mb-1">Transit Time</div>
                          <div className="text-lg font-bold text-blue-700 prediction-value">
                            {prediction.transit_time_days.toFixed(1)} days
                          </div>
                        </div>

                        <div className="bg-green-50 p-3 rounded-md">
                          <div className="text-xs text-green-600 font-medium mb-1">Shipping Cost</div>
                          <div className="text-lg font-bold text-green-700 prediction-value">
                            ${prediction.shipping_cost_usd.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!actionData && !showSkeleton && (
                <div className="text-center text-gray-500 py-8 fade-in">
                  Loading initial predictions...
                </div>
              )}

              {/* Disclaimer - always show when we have prediction data */}
              {(actionData?.success && actionData.predictions) && (
                <div className="text-xs text-gray-500 mt-4">
                  Predictions are based on historical shipping data and machine learning models.
                  Actual results may vary.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Training Data Info */}
        <div className="mt-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                <p className="text-sm font-medium text-blue-900">Model Training Data</p>
              </div>
              {!trainingLoading && (
                <p className="text-xs text-blue-600">
                  Updated: {formatLastUpdated()}
                </p>
              )}
            </div>
            <p className="text-xs text-blue-700">
              {trainingLoading ? (
                "Loading training information..."
              ) : (
                <>
                  Models trained on <span className="font-semibold">{formatShipmentCount()} simulated shipments</span> from
                  <span className="font-semibold"> {formatDateRange()}</span> across
                  all major carriers (USPS, UPS, FedEx) and service levels.
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
