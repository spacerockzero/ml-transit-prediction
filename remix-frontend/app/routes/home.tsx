import { Link } from "react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";

export function meta() {
  return [
    { title: "ML Transit Time Prediction" },
    { name: "description", content: "Predict shipping transit time and cost using machine learning" },
  ];
}

export default function Home() {
  return (
    <div className="px-4 py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-4">
          ML Transit Time Prediction
        </h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          Get accurate shipping transit time and cost predictions using machine learning models trained on historical shipping data.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/predict"
            className="inline-flex items-center justify-center px-6 py-3 text-base font-medium text-white bg-primary rounded-md shadow hover:bg-primary/90 transition-colors"
          >
            Start Prediction
          </Link>
          <Link
            to="/analytics"
            className="inline-flex items-center justify-center px-6 py-3 text-base font-medium text-primary bg-secondary rounded-md shadow hover:bg-secondary/80 transition-colors"
          >
            View Analytics
          </Link>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>ML Prediction Engine</CardTitle>
            <CardDescription>
              Advanced machine learning models for transit time and cost prediction
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li>• Trained on historical shipping data</li>
              <li>• Multi-carrier support (UPS, FedEx, USPS)</li>
              <li>• Zone-based routing optimization</li>
              <li>• Real-time cost estimation</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Analytics Dashboard</CardTitle>
            <CardDescription>
              Comprehensive statistical analysis and service optimization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li>• Service level performance metrics</li>
              <li>• Distribution analysis and histograms</li>
              <li>• Statistical comparison tools</li>
              <li>• Percentile-based optimization</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
