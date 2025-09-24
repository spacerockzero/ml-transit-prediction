import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("predict", "routes/predict.tsx"),
  route("analytics", "routes/analytics.tsx", [
    index("routes/analytics/index.tsx"),
    route("overview", "routes/analytics/overview.tsx"),
    route("compare", "routes/analytics/compare.tsx"),
    route("distributions", "routes/analytics/distributions.tsx"),
    route("optimizer", "routes/analytics/optimizer.tsx"),
  ]),
] satisfies RouteConfig;
