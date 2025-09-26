import { Link } from "react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { DashboardLayout } from "~/components/DashboardLayout";
import { BarChart3, Target, TrendingUp, Zap } from "lucide-react";
import { useResponseTimeStats } from "~/hooks/useResponseTimeStats";
import { usePredictionStats } from "~/hooks/usePredictionStats";

export function meta() {
  return [
    { title: "Dashboard - iDrive AI Transit Time Prediction" },
    { name: "description", content: "Predict shipping transit time and cost using machine learning" },
  ];
}

export default function Home() {
  const { stats, isLoading, error } = useResponseTimeStats(5000); // Update every 5 seconds
  const { stats: predictionStats, isLoading: predictionLoading, error: predictionError } = usePredictionStats(5000);

  // Format the response time display
  const formatResponseTime = () => {
    if (isLoading) return "...";
    if (error || stats.totalRequests === 0) return "0ms";
    return `${stats.averageMs}ms`;
  };

  const getResponseTimeColor = () => {
    if (isLoading || error || stats.totalRequests === 0) return "text-muted-foreground";

    if (stats.averageMs < 100) return "text-green-600";
    if (stats.averageMs < 300) return "text-yellow-600";
    return "text-red-600";
  };

  // Format predictions today display
  const formatPredictionsToday = () => {
    if (predictionLoading) return "...";
    if (predictionError) return "0";
    return predictionStats.today.toLocaleString();
  };

  return (
    <DashboardLayout
      title="Dashboard"
      subtitle="Welcome to your iDrive AI Transit Time Prediction platform"
    >
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Predictions Today</p>
                <p className="text-2xl font-bold">{formatPredictionsToday()}</p>
                {predictionStats.total > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {predictionStats.total.toLocaleString()} total
                  </p>
                )}
              </div>
              <Target className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        {/* <Card className="card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Accuracy Rate</p>
                <p className="text-2xl font-bold">94.2%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card> */}

        <Card className="card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Response Time</p>
                <p className={`text-2xl font-bold ${getResponseTimeColor()}`}>
                  {formatResponseTime()}
                </p>
                {stats.totalRequests > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.totalRequests} total requests
                  </p>
                )}
              </div>
              <Zap className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className="card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Models</p>
                <p className="text-2xl font-bold">3</p>
              </div>
              <BarChart3 className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Card className="card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5" />
              <span>Make Predictions</span>
            </CardTitle>
            <CardDescription>
              Get instant shipping predictions for your packages
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Use our ML models to predict transit times and costs across multiple carriers and service levels.
            </p>
            <Link
              to="/predict"
              className="btn-primary inline-flex items-center space-x-2"
            >
              <Target className="h-4 w-4" />
              <span>Start Prediction</span>
            </Link>
          </CardContent>
        </Card>

        <Card className="card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <span>Analytics Dashboard</span>
            </CardTitle>
            <CardDescription>
              Explore performance metrics and insights
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Analyze shipping patterns, compare service levels, and optimize your logistics strategy.
            </p>
            <Link
              to="/analytics"
              className="btn-secondary inline-flex items-center space-x-2"
            >
              <BarChart3 className="h-4 w-4" />
              <span>View Analytics</span>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Feature Overview */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="card">
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

        <Card className="card">
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
    </DashboardLayout>
  );
}
