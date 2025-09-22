# Fastify ONNX Server - Transit Time & Shipping Cost Prediction

A high-performance Fastify.js server that provides REST API endpoints for transit time and shipping cost predictions using LightGBM models via Python inference.

## Features

- **Fast API**: Built with Fastify.js for high performance
- **Dual Predictions**: Predicts both transit time and shipping cost
- **USPS Zone Support**: Uses realistic USPS zones 1-9
- **Batch Processing**: Supports batch predictions
- **Input Validation**: JSON schema validation
- **Error Handling**: Comprehensive error handling
- **CORS Support**: Cross-origin requests enabled

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Server
```bash
npm start
```

The server will start on `http://localhost:3000`

### 3. Test the API
```bash
npm test
```

## API Endpoints

### Health Check
```bash
GET /health
```

### Model Information
```bash
GET /models/info
```

### Sample Input Format
```bash
GET /sample-input
```

### Predict Both Time and Cost
```bash
POST /predict
Content-Type: application/json

{
  "ship_date": "2024-01-15",
  "origin_zone": "Zone_1",
  "dest_zone": "Zone_5",
  "carrier": "FedEx",
  "service_level": "EXPRESS",
  "package_weight_lbs": 2.5,
  "package_length_in": 10.0,
  "package_width_in": 8.0,
  "package_height_in": 6.0
}
```

**Response:**
```json
{
  "success": true,
  "predictions": {
    "transit_time_days": 2.45,
    "shipping_cost_usd": 18.75
  },
  "input": { ... },
  "processing_time_ms": 123
}
```

### Predict Transit Time Only
```bash
POST /predict/transit-time
```

### Predict Shipping Cost Only
```bash
POST /predict/shipping-cost
```

### Batch Predictions
```bash
POST /predict/batch
Content-Type: application/json

{
  "predictions": [
    {
      "ship_date": "2024-01-15",
      "origin_zone": "Zone_1",
      "dest_zone": "Zone_9",
      ...
    },
    {
      "ship_date": "2024-01-16",
      "origin_zone": "Zone_2",
      "dest_zone": "Zone_6",
      ...
    }
  ]
}
```

## Input Parameters

### Required Fields
- **ship_date**: Date string (YYYY-MM-DD format)
- **origin_zone**: USPS zone (Zone_1 to Zone_9)
- **dest_zone**: USPS zone (Zone_1 to Zone_9)
- **carrier**: Carrier name
- **service_level**: Service type
- **package_weight_lbs**: Package weight in pounds (0.1-70)
- **package_length_in**: Length in inches (1-100)
- **package_width_in**: Width in inches (1-100)
- **package_height_in**: Height in inches (1-100)

### Valid Values

**USPS Zones:**
- Zone_1, Zone_2, Zone_3, Zone_4, Zone_5, Zone_6, Zone_7, Zone_8, Zone_9

**Carriers:**
- USPS, FedEx, UPS, DHL, Amazon_Logistics, OnTrac, LaserShip, Regional_Express

**Service Levels:**
- STANDARD, EXPRESS, OVERNIGHT, ECONOMY, PRIORITY

## Example Usage

### cURL Examples

**Basic Prediction:**
```bash
curl -X POST http://localhost:3000/predict \\
  -H "Content-Type: application/json" \\
  -d '{
    "ship_date": "2024-01-15",
    "origin_zone": "Zone_1",
    "dest_zone": "Zone_5",
    "carrier": "UPS",
    "service_level": "EXPRESS",
    "package_weight_lbs": 2.5,
    "package_length_in": 10,
    "package_width_in": 8,
    "package_height_in": 6
  }'
```

**Health Check:**
```bash
curl http://localhost:3000/health
```

### JavaScript/Fetch Example

```javascript
const prediction = await fetch('http://localhost:3000/predict', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    ship_date: '2024-01-15',
    origin_zone: 'Zone_1',
    dest_zone: 'Zone_5',
    carrier: 'UPS',
    service_level: 'EXPRESS',
    package_weight_lbs: 2.5,
    package_length_in: 10,
    package_width_in: 8,
    package_height_in: 6
  })
});

const result = await prediction.json();
console.log(\`Transit time: \${result.predictions.transit_time_days} days\`);
console.log(\`Shipping cost: $\${result.predictions.shipping_cost_usd}\`);
```

## Development

### Start in Development Mode (with auto-reload)
```bash
npm run dev
```

### Environment Variables
- **PORT**: Server port (default: 3000)
- **HOST**: Server host (default: 0.0.0.0)

## Architecture

The server uses a hybrid architecture:
1. **Fastify.js**: High-performance web framework
2. **Python Backend**: LightGBM models run via Python subprocess
3. **Input Validation**: JSON schema validation
4. **Error Handling**: Comprehensive error responses

## Performance

- **Typical Response Time**: 50-200ms per prediction
- **Batch Processing**: Up to 100 predictions per request
- **Concurrent Requests**: Handled efficiently by Fastify

## Error Responses

**Validation Error (400):**
```json
{
  "success": false,
  "error": "Validation error",
  "details": [...]
}
```

**Server Error (500):**
```json
{
  "success": false,
  "error": "Internal server error"
}
```

## Dependencies

### Node.js Dependencies
- **fastify**: Web framework
- **@fastify/cors**: CORS support
- **python-shell**: Python subprocess execution
- **pino-pretty**: Pretty logging (dev)

### Python Dependencies (managed by uv)
- **lightgbm**: Machine learning models
- **pandas**: Data processing
- **numpy**: Numerical operations
- **joblib**: Model serialization

## Files Structure

```
fastify-onnx-server/
├── server.js              # Main Fastify server
├── inference_wrapper.py   # Python inference wrapper
├── convert_to_onnx.py     # Model conversion script
├── test.js                # Test suite
├── package.json           # Node.js dependencies
├── onnx_models/           # Model files directory
│   ├── lgb_transit_time_model.txt
│   ├── lgb_shipping_cost_model.txt
│   ├── model_metadata.json
│   └── sample_input.json
└── README.md              # This file
```

## Production Deployment

For production deployment:

1. **Environment Setup**: Ensure Python virtual environment is available
2. **Process Management**: Use PM2 or similar for process management
3. **Load Balancing**: Consider multiple server instances
4. **Monitoring**: Add logging and monitoring
5. **Security**: Add authentication if needed

Example PM2 configuration:
```json
{
  "name": "fastify-onnx-server",
  "script": "server.js",
  "instances": "max",
  "exec_mode": "cluster",
  "env": {
    "NODE_ENV": "production",
    "PORT": 3000
  }
}
```