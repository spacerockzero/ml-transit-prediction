# ML Transit Time Prediction Frontend

A modern React Router (Remix) application for predicting shipping transit time and cost using machine learning models.

## Features

- **Professional UI**: Built with React Router v7, TypeScript, and Tailwind CSS
- **ML Predictions**: Integrates with ONNX model inference server
- **Real-time Estimates**: Get instant predictions for shipping transit time and cost
- **USPS Zone Support**: Supports all 9 USPS shipping zones
- **Multiple Carriers**: USPS, UPS, and FedEx support
- **Package Dimensions**: Accounts for weight, dimensions, and insurance value

## Tech Stack

- **Framework**: React Router v7 (formerly Remix)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: Custom shadcn/ui-inspired components
- **API Integration**: REST API calls to Fastify ONNX server

## Prerequisites

- Node.js 18+
- Running Fastify ONNX inference server (see `../fastify-onnx-server/`)

## Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:5173`

## Usage

1. **Home Page**: Introduction and navigation to prediction interface
2. **Prediction Page** (`/predict`): Main interface for getting shipping estimates

### Making Predictions

1. **Origin/Destination**: Select USPS zones (1-9)
2. **Carrier**: Choose from USPS, UPS, or FedEx
3. **Service Level**: Ground, Express, Priority, or Overnight
4. **Package Details**:
   - Weight (0.1-70 lbs)
   - Dimensions (length, width, height in inches)
   - Insurance value ($0-$5000)
5. **Get Prediction**: Click to receive ML-powered estimates

### Results

The application displays:
- **Transit Time**: Estimated days for delivery
- **Shipping Cost**: Estimated cost in USD

## API Integration

The frontend communicates with the Fastify ONNX server at `http://localhost:3000/predict`:

```typescript
interface PredictionRequest {
  origin_zone: number;       // 1-9
  dest_zone: number;         // 1-9
  carrier: string;           // "USPS" | "UPS" | "FedEx"
  service_level: string;     // "Ground" | "Express" | "Priority" | "Overnight"
  weight_lbs: number;        // 0.1-70
  length_in: number;         // 1-108
  width_in: number;          // 1-108
  height_in: number;         // 1-108
  insurance_value: number;   // 0-5000
}

interface PredictionResponse {
  success: boolean;
  predictions: {
    transit_time_days: number;
    shipping_cost_usd: number;
  };
  input: PredictionRequest;
}
```

## Components

### UI Components (`app/components/ui/`)

- **Button**: Styled button with variants (default, outline, secondary, etc.)
- **Card**: Container components for content sections
- **Input**: Form input with consistent styling
- **Label**: Form labels with proper accessibility
- **Select**: Dropdown selection component

### Utilities (`app/lib/`)

- **utils.ts**: Utility functions including `cn()` for class merging

## Development

### File Structure

```
app/
├── components/ui/          # Reusable UI components
├── lib/                    # Utility functions
├── routes/                 # Page routes
│   ├── home.tsx           # Landing page
│   └── predict.tsx        # Main prediction interface
├── app.css                # Global styles
└── root.tsx               # App root component
```

### Styling

The application uses Tailwind CSS with a custom design system:
- Color palette optimized for shipping/logistics
- Responsive design for mobile and desktop
- Consistent spacing and typography
- Professional business appearance

### Error Handling

- Form validation for all inputs
- API error display with user-friendly messages
- Loading states during prediction requests
- Network error recovery

## Testing

The application can be tested by:

1. Starting the inference server:
   ```bash
   cd ../fastify-onnx-server
   node server.js
   ```

2. Starting the frontend:
   ```bash
   npm run dev
   ```

3. Navigate to `http://localhost:5173/predict` and test predictions

## Production Build

```bash
# Build for production
npm run build

# Start production server
npm run start
```

## Related Projects

- **Inference Server**: `../fastify-onnx-server/` - ONNX model serving
- **ML Training**: `../transit_time_cost/` - Model training and data generation
- **Data Processing**: Python scripts for feature engineering and model conversion

---

Built with ❤️ using React Router and Machine Learning.
