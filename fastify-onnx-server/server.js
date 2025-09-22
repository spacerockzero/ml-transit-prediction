import Fastify from 'fastify';
import cors from '@fastify/cors';
import { PythonShell } from 'python-shell';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Fastify
const fastify = Fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  },
});

// Register CORS
await fastify.register(cors, {
  origin: true,
});

// Load model metadata
let modelMetadata;
try {
  const metadataPath = path.join(__dirname, 'onnx_models', 'model_metadata.json');
  modelMetadata = JSON.parse(readFileSync(metadataPath, 'utf8'));
} catch (error) {
  console.error('Error loading model metadata:', error);
  process.exit(1);
}

// Health check endpoint
fastify.get('/health', async (request, reply) => {
  return { 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    models: {
      transit_time: modelMetadata.transit_time_model.model_name,
      shipping_cost: modelMetadata.shipping_cost_model.model_name
    }
  };
});

// Model info endpoint
fastify.get('/models/info', async (request, reply) => {
  return {
    metadata: modelMetadata,
    endpoints: {
      predict: '/predict',
      predict_transit_time: '/predict/transit-time',
      predict_shipping_cost: '/predict/shipping-cost',
      predict_batch: '/predict/batch'
    }
  };
});

// Input validation schema
const predictionInputSchema = {
  type: 'object',
  required: [
    'ship_date',
    'origin_zone', 
    'dest_zone',
    'carrier',
    'service_level',
    'package_weight_lbs',
    'package_length_in',
    'package_width_in',
    'package_height_in',
    'insurance_value'
  ],
  properties: {
    ship_date: { type: 'string', format: 'date' },
    origin_zone: { 
      type: 'integer',
      minimum: 1,
      maximum: 9
    },
    dest_zone: { 
      type: 'integer',
      minimum: 1,
      maximum: 9
    },
    carrier: {
      type: 'string',
      enum: ['USPS', 'FedEx', 'UPS', 'DHL', 'Amazon_Logistics', 'OnTrac', 'LaserShip', 'Regional_Express']
    },
    service_level: {
      type: 'string', 
      enum: ['Ground', 'Express', 'Priority', 'Overnight']
    },
    package_weight_lbs: { type: 'number', minimum: 0.1, maximum: 70 },
    package_length_in: { type: 'number', minimum: 1, maximum: 100 },
    package_width_in: { type: 'number', minimum: 1, maximum: 100 },
    package_height_in: { type: 'number', minimum: 1, maximum: 100 },
    insurance_value: { type: 'number', minimum: 0, maximum: 10000 }
  }
};

// Helper function to call Python inference
async function callPythonInference(inputData) {
  return new Promise((resolve, reject) => {
    const options = {
      mode: 'text',
      pythonPath: path.join(__dirname, '..', '.venv', 'bin', 'python'),
      scriptPath: __dirname,
      args: [JSON.stringify(inputData)]
    };

    PythonShell.run('inference_wrapper.py', options, (err, results) => {
      if (err) {
        reject(err);
        return;
      }
      
      try {
        const result = JSON.parse(results[0]);
        resolve(result);
      } catch (parseError) {
        reject(new Error(`Failed to parse Python output: ${parseError.message}`));
      }
    });
  });
}

// Main prediction endpoint
fastify.post('/predict', {
  schema: {
    body: predictionInputSchema,
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          predictions: {
            type: 'object',
            properties: {
              transit_time_days: { type: 'number' },
              shipping_cost_usd: { type: 'number' }
            }
          },
          input: { type: 'object' },
          processing_time_ms: { type: 'number' }
        }
      }
    }
  }
}, async (request, reply) => {
  const startTime = Date.now();
  
  try {
    const result = await callPythonInference(request.body);
    const processingTime = Date.now() - startTime;
    
    if (result.success) {
      return {
        ...result,
        processing_time_ms: processingTime
      };
    } else {
      reply.code(400);
      return {
        success: false,
        error: result.error,
        processing_time_ms: processingTime
      };
    }
  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    reply.code(500);
    return {
      success: false,
      error: `Inference failed: ${error.message}`,
      processing_time_ms: processingTime
    };
  }
});

// Transit time only endpoint
fastify.post('/predict/transit-time', {
  schema: {
    body: predictionInputSchema
  }
}, async (request, reply) => {
  try {
    const result = await callPythonInference(request.body);
    
    if (result.success) {
      return {
        success: true,
        transit_time_days: result.predictions.transit_time_days,
        input: result.input
      };
    } else {
      reply.code(400);
      return {
        success: false,
        error: result.error
      };
    }
  } catch (error) {
    reply.code(500);
    return {
      success: false,
      error: `Inference failed: ${error.message}`
    };
  }
});

// Shipping cost only endpoint
fastify.post('/predict/shipping-cost', {
  schema: {
    body: predictionInputSchema
  }
}, async (request, reply) => {
  try {
    const result = await callPythonInference(request.body);
    
    if (result.success) {
      return {
        success: true,
        shipping_cost_usd: result.predictions.shipping_cost_usd,
        input: result.input
      };
    } else {
      reply.code(400);
      return {
        success: false,
        error: result.error
      };
    }
  } catch (error) {
    reply.code(500);
    return {
      success: false,
      error: `Inference failed: ${error.message}`
    };
  }
});

// Batch prediction endpoint
fastify.post('/predict/batch', {
  schema: {
    body: {
      type: 'object',
      required: ['predictions'],
      properties: {
        predictions: {
          type: 'array',
          items: predictionInputSchema,
          maxItems: 100 // Limit batch size
        }
      }
    }
  }
}, async (request, reply) => {
  const startTime = Date.now();
  const { predictions: inputArray } = request.body;
  
  try {
    // Process predictions in parallel
    const promises = inputArray.map(input => callPythonInference(input));
    const results = await Promise.all(promises);
    
    const processingTime = Date.now() - startTime;
    
    return {
      success: true,
      count: results.length,
      results: results,
      processing_time_ms: processingTime
    };
  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    reply.code(500);
    return {
      success: false,
      error: `Batch inference failed: ${error.message}`,
      processing_time_ms: processingTime
    };
  }
});

// Sample input endpoint
fastify.get('/sample-input', async (request, reply) => {
  try {
    const samplePath = path.join(__dirname, 'onnx_models', 'sample_input.json');
    const sampleInput = JSON.parse(readFileSync(samplePath, 'utf8'));
    
    return {
      sample_input: sampleInput,
      description: "Use this format for prediction requests",
      endpoints: {
        predict_both: "POST /predict",
        predict_time_only: "POST /predict/transit-time", 
        predict_cost_only: "POST /predict/shipping-cost"
      }
    };
  } catch (error) {
    reply.code(500);
    return {
      success: false,
      error: `Could not load sample input: ${error.message}`
    };
  }
});

// Error handler
fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error(error);
  
  if (error.validation) {
    reply.code(400).send({
      success: false,
      error: 'Validation error',
      details: error.validation
    });
  } else {
    reply.code(500).send({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Start server
const start = async () => {
  try {
    const port = process.env.PORT || 3000;
    const host = process.env.HOST || '0.0.0.0';
    
    await fastify.listen({ port, host });
    
    console.log('\\n🚀 Fastify ONNX Server Started!');
    console.log(`📡 Server listening on http://${host}:${port}`);
    console.log('\\n📋 Available endpoints:');
    console.log('  GET  /health                    - Health check');
    console.log('  GET  /models/info               - Model information');
    console.log('  GET  /sample-input              - Sample input format');
    console.log('  POST /predict                   - Predict both time and cost');
    console.log('  POST /predict/transit-time      - Predict transit time only');
    console.log('  POST /predict/shipping-cost     - Predict shipping cost only');
    console.log('  POST /predict/batch             - Batch predictions');
    console.log('\\n🎯 Model info:');
    console.log(`  Transit Time Model: ${modelMetadata.transit_time_model.num_features} features`);
    console.log(`  Shipping Cost Model: ${modelMetadata.shipping_cost_model.num_features} features`);
    
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();