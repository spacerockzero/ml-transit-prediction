import { Link } from "react-router";

export function meta() {
  return [
    { title: "ML Transit Time Prediction" },
    { name: "description", content: "Predict shipping transit time and cost using machine learning" },
  ];
}

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          ML Transit Time Prediction
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Get accurate shipping transit time and cost predictions using machine learning models trained on historical shipping data.
        </p>
        <Link 
          to="/predict" 
          className="inline-flex items-center justify-center rounded-md bg-blue-600 px-8 py-3 text-lg font-medium text-white shadow hover:bg-blue-700 transition-colors"
        >
          Start Prediction
        </Link>
      </div>
    </div>
  );
}
