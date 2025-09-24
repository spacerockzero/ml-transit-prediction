# ML Transit Time & Cost Prediction System

A complete machine learning pipeline for predicting shipping transit times and costs, featuring data generation, model training, statistical analysis, and a full-stack web application for real-time predictions and analytics.

## 🌟 Features

- **ML Pipeline**: Complete training pipeline for transit time and cost prediction models
- **Synthetic Data Generation**: Realistic shipping data with USPS zones, carriers, and service levels
- **Statistical Analysis**: Comprehensive analytics with normal distributions and percentile analysis
- **REST API**: High-performance Fastify.js inference server with batch processing
- **Web Dashboard**: Modern React/Remix frontend with interactive charts and analytics
- **USPS Zone System**: Accurate zone-based distance modeling (Zones 1-9)

## 🏗️ Architecture

```
├── transit_time/           # ⚠️ DEPRECATED - Use transit_time_cost instead
├── transit_time_cost/      # ✅ PRIMARY - Combined transit time & cost models  
├── transit_time_zones/     # ✅ ACTIVE - Zone-based models with enhanced features
├── statistical_analysis/   # Data analysis and distribution modeling
├── fastify-inference-server/ # Node.js API server for predictions
├── remix-frontend/         # React/Remix web application
└── main.py                 # Entry point for training pipeline
```

### 📊 Model Hierarchy

| Directory | Purpose | Status | Use Case |
|-----------|---------|--------|----------|
| `transit_time/` | Basic transit time only | 🚫 **DEPRECATED** | Superseded by better models |
| `transit_time_cost/` | Time + Cost predictions | ✅ **PRIMARY** | Production inference server |
| `transit_time_zones/` | Zone-optimized models | ✅ **ACTIVE** | Geographic analysis |

**Note:** The inference server uses models from `transit_time_cost/` for optimal accuracy.

## 🚀 Quick Start

### Prerequisites

- Python 3.12+ (managed with pyenv/uv)
- Node.js 18+
- uv (for Python dependency management)

### 1. Setup Environment

```bash
# Clone the repository
git clone <repository-url>
cd ml-transit-time-prediction

# Install Python dependencies
uv sync

# Activate virtual environment (if not auto-activated)
source .venv/bin/activate
```

### 2. Generate Data & Train Models

```bash
# Generate synthetic data and train all models
uv run python main.py

# Or train individual components:
uv run python transit_time/train_model.py
uv run python transit_time_cost/train_model.py  
uv run python transit_time_zones/train_model.py
```

This will:
- Generate realistic shipping datasets
- Train LightGBM models for transit time and cost prediction
- Create ONNX model files for production inference
- Generate feature engineering artifacts

### 3. Run Statistical Analysis

```bash
# Generate enhanced data with statistical distributions
cd statistical_analysis
uv run python generate_statistical_data.py

# Run comprehensive analysis
uv run python statistics_analyzer.py
```

### 4. Start Both Services (Recommended)

```bash
# Install all dependencies for both services
npm run install:all

# Start both server and frontend in development mode
npm run dev
```

This will start both services concurrently:
- **Inference Server**: `http://localhost:3000`
- **Web Frontend**: `http://localhost:5173`

### 4a. Start Services Individually

#### Start the Inference Server

```bash
cd fastify-inference-server

# Install dependencies
npm install

# Start development server (with auto-restart)
npm run dev

# Or start production server
npm start
```

The API server will be available at `http://localhost:3000`

#### Launch the Web Frontend

```bash
cd remix-frontend

# Install dependencies  
npm install

# Start development server
npm run dev

# Build for production
npm run build
npm start
```

The web application will be available at `http://localhost:5173`

## 📊 Data & Models

### Synthetic Data Features

- **Carriers**: USPS, FedEx, UPS, DHL, Amazon Logistics, OnTrac, LaserShip
- **Service Levels**: Ground, Express, Priority, Overnight
- **USPS Zones**: 1-9 (representing distance/geographic regions)
- **Package Attributes**: Weight, dimensions, insurance value
- **Temporal Features**: Date-based cyclical encoding
- **Advanced Features**: Dimensional weight, volume ratios, route combinations

### Model Performance

- **LightGBM Models**: Optimized gradient boosting for production inference
- **Feature Engineering**: 15+ engineered features including target encoding
- **ONNX Export**: Cross-platform model deployment
- **Batch Processing**: Efficient bulk prediction capabilities

## 🌐 API Endpoints

### Prediction Endpoints

```bash
# Single prediction
POST /predict
{
  "ship_date": "2025-09-22",
  "zone": 1,
  "carrier": "FedEx", 
  "service_level": "Express",
  "package_weight_lbs": 2.5,
  "package_length_in": 10,
  "package_width_in": 8,
  "package_height_in": 6,
  "insurance_value": 100
}

# Transit time only
POST /predict/transit-time

# Shipping cost only  
POST /predict/shipping-cost

# Batch predictions
POST /predict/batch
```

### Analytics Endpoints

```bash
# Service level statistics
GET /analytics/summary

# Distribution analysis
GET /analytics/distributions

# 2-sigma comparisons
GET /analytics/compare-2sigma

# Percentile analysis
GET /analytics/percentile?threshold=90

# Histogram data
GET /analytics/histogram?service_level=Express
```

### Utility Endpoints

```bash
# Health check
GET /health

# Model information
GET /models/info

# Sample input format
GET /sample-input
```

## 📈 Web Dashboard Features

### Prediction Interface
- Interactive form for shipment details
- Real-time predictions with processing time
- Input validation and error handling
- USPS zone selection (1-9)

### Analytics Dashboard
- **Service Level Analysis**: Performance metrics by carrier and service
- **Distribution Charts**: Transit time distributions with normal curve fitting
- **Comparison Tools**: 2-sigma analysis for service level optimization
- **Percentile Analysis**: Threshold-based service recommendations
- **Interactive Visualizations**: Built with Recharts for professional data presentation

## 🛠️ Development

### Project Structure

```
ml-transit-time-prediction/
├── .venv/                     # Python virtual environment
├── fastify-inference-server/  # Node.js API server
│   ├── onnx_models/          # Trained model artifacts
│   ├── server.js             # Main server file
│   ├── inference_wrapper.py  # Python inference bridge
│   └── analytics_wrapper.py  # Statistical analysis bridge
├── remix-frontend/           # React/Remix web app
│   ├── app/routes/          # Page components
│   ├── app/components/ui/   # Reusable UI components  
│   └── public/              # Static assets
├── statistical_analysis/    # Data analysis tools
│   ├── generate_statistical_data.py
│   └── statistics_analyzer.py
└── transit_time_*/         # Model training directories
```

### Key Technologies

**Backend:**
- **Python**: uv, pandas, numpy, scikit-learn, LightGBM
- **Node.js**: Fastify.js, python-shell, CORS support
- **Models**: LightGBM → ONNX for production inference

**Frontend:**
- **React Router**: Modern React framework with SSR
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **shadcn/ui**: Professional component library
- **Recharts**: Interactive data visualizations

### Development Commands

```bash
# Root level commands (recommended)
npm run dev                # Start both services in development
npm run start              # Start both services in production
npm run install:all        # Install dependencies for all services
npm run build              # Build both services
npm run test               # Run server tests

# Python environment
uv add <package>           # Add Python dependency
uv run python <script>     # Run with virtual environment
uv run main.py             # Run complete training pipeline

# Individual service commands
cd fastify-inference-server
npm run dev               # Auto-restart on changes
npm test                  # Run API tests

cd remix-frontend
npm run dev               # Hot reload development
npm run typecheck         # TypeScript validation
npm run build             # Production build
```

## 🧪 Testing

### API Testing

```bash
# Test prediction endpoint
curl -X POST http://localhost:3000/predict \\
  -H "Content-Type: application/json" \\
  -d '{"ship_date":"2025-09-22","zone":1,"carrier":"FedEx","service_level":"Express","package_weight_lbs":2.5,"package_length_in":10,"package_width_in":8,"package_height_in":6,"insurance_value":100}'

# Test analytics
curl http://localhost:3000/analytics/summary

# Run server test suite
cd fastify-inference-server && npm test
```

### Python Testing

```bash
# Test model training
uv run python test_api.py

# Test individual components
uv run python transit_time_zones/test_model.py
```

## 🔧 Configuration

### Environment Variables

```bash
# Server configuration
PORT=3000
NODE_ENV=development

# Python configuration  
PYTHONPATH=.
```

### Model Configuration

Models are automatically configured during training. Key parameters:

- **LightGBM**: 100 estimators, learning rate 0.1
- **Features**: 15+ engineered features with target encoding
- **Validation**: Time-based train/test split
- **Export**: ONNX format for cross-platform deployment

## 📚 Documentation

- **API Documentation**: See `fastify-inference-server/README.md`
- **Frontend Guide**: See `remix-frontend/README.md`  
- **Model Training**: Individual README files in training directories
- **Statistical Analysis**: See `statistical_analysis/README.md`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🚀 Production Deployment

### Docker Deployment (Recommended)

```bash
# Build and run with Docker Compose
docker-compose up --build

# Or build individual services
docker build -t transit-api ./fastify-inference-server
docker build -t transit-frontend ./remix-frontend
```

### Manual Deployment

1. **Train Models**: Run training pipeline on production data
2. **Deploy API**: Use PM2 or similar for Node.js process management
3. **Deploy Frontend**: Build static assets and serve with nginx/Apache
4. **Database**: Consider PostgreSQL for production analytics data
5. **Monitoring**: Add logging, metrics, and health checks

---

**Built with ❤️ for accurate shipping predictions and data-driven logistics optimization.**