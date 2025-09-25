import type { ActionFunction, LoaderFunction } from "react-router";
import { Form, Outlet, useActionData, useLoaderData, useNavigation, Link, useLocation, redirect } from "react-router";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

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

export default function AnalyticsLayout() {
  const location = useLocation();
  const loaderData = useLoaderData<ActionData>();
  const actionData = useActionData<ActionData>();
  const navigation = useNavigation();
  const [formData, setFormData] = useState({
    service_level: "",
    zone: "",
    metric: "transit_time",
    percentile: "50",
    method: "normal"
  });

  // Merge loader and action data
  const data = {
    ...loaderData?.data,
    ...actionData?.data
  };

  const isLoading = navigation.state === "submitting";
  const error = loaderData?.error || actionData?.error;

  const tabs = [
    { id: "overview", label: "Overview", href: "/analytics/overview" },
    { id: "compare", label: "Service Comparison", href: "/analytics/compare" },
    { id: "distributions", label: "Distributions", href: "/analytics/distributions" }
  ];

  const currentTab = tabs.find(tab => location.pathname === tab.href ||
    (location.pathname === "/analytics" && tab.id === "overview")) || tabs[0];

  return (
    <div className="px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Transit Time Analytics</h1>
        <p className="text-muted-foreground mt-2">
          Analyze shipping performance and optimize service level selection for different zones.
        </p>
      </div>

      {error && (
        <Card className="mb-6 border-destructive bg-destructive/10">
          <CardContent className="pt-6">
            <p className="text-destructive">Error: {error}</p>
          </CardContent>
        </Card>
      )}

      {/* Navigation Tabs */}
      <div className="flex space-x-1 mb-8 bg-muted p-1 rounded-lg">
        {tabs.map(tab => (
          <Link
            key={tab.id}
            to={tab.href}
            className={cn(
              "flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors text-center",
              currentTab?.id === tab.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Pass data to child routes */}
      <Outlet context={{ data, formData, setFormData, isLoading }} />
    </div>
  );
}
