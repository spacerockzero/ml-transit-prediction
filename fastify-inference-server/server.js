import Fastify from 'fastify';
import cors from '@fastify/cors';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { PythonShell } from 'python-shell';

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
    'zone',
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
    zone: {
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
    // Try virtual environment first, fallback to system python
    const venvPath = path.join(__dirname, '..', '.venv');
    const venvPython = path.join(venvPath, 'bin', 'python');
    
    let command;
    let options;
    
    // Check if venv python exists
    try {
      if (existsSync(venvPython)) {
        // Use virtual environment with proper activation
        command = `source ${path.join(venvPath, 'bin', 'activate')} && python inference_wrapper.py '${JSON.stringify(inputData)}'`;
        options = {
          shell: true,
          cwd: __dirname,
          env: {
            ...process.env,
            VIRTUAL_ENV: venvPath,
            PATH: `${path.join(venvPath, 'bin')}:${process.env.PATH}`
          }
        };
        console.log('Using virtual environment:', venvPath);
      } else {
        // Fallback to system python3
        command = `python3 inference_wrapper.py '${JSON.stringify(inputData)}'`;
        options = {
          shell: true,
          cwd: __dirname
        };
        console.warn('Virtual environment not found, using system python3');
      }
    } catch (e) {
      console.warn('Error checking Python path, using system python3');
      command = `python3 inference_wrapper.py '${JSON.stringify(inputData)}'`;
      options = {
        shell: true,
        cwd: __dirname
      };
    }

    console.log('Calling Python with input:', inputData);
    console.log('Command:', command);
    console.log('Working directory:', options.cwd);

    // Add timeout to prevent hanging
    const timeout = setTimeout(() => {
      reject(new Error('Python script execution timed out after 30 seconds'));
    }, 30000);

    // Use child_process.exec instead of PythonShell for better control
    exec(command, options, (err, stdout, stderr) => {
      clearTimeout(timeout);
      
      if (err) {
        console.error('Python execution error:', err);
        console.error('stderr:', stderr);
        console.error('stdout:', stdout);
        reject(err);
        return;
      }
      
      if (stderr) {
        console.log('Python stderr (debug info):', stderr);
      }
      
      console.log('Python stdout:', stdout);
      
      if (!stdout || stdout.trim().length === 0) {
        console.error('No output from Python script');
        reject(new Error('No output from Python script'));
        return;
      }
      
      try {
        // Split output by lines and find the JSON result
        const lines = stdout.trim().split('\n');
        let jsonResult = null;
        
        for (const line of lines) {
          const trimmedLine = line.trim();
          if (trimmedLine.startsWith('{') && trimmedLine.includes('"success"')) {
            try {
              jsonResult = JSON.parse(trimmedLine);
              break;
            } catch (e) {
              // Continue to next line
            }
          }
        }
        
        if (jsonResult) {
          console.log('Parsed Python result:', jsonResult);
          resolve(jsonResult);
        } else {
          console.error('No valid JSON result found in Python output');
          console.error('All output lines:', lines);
          reject(new Error('No valid JSON result found in Python output'));
        }
      } catch (parseError) {
        console.error('Parse error:', parseError);
        console.error('Raw output that failed to parse:', stdout);
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
  },
  config: {
    timeout: 35000 // 35 second timeout
  }
}, async (request, reply) => {
  const startTime = Date.now();
  
  console.log('Predict endpoint called with body:', request.body);
  
  try {
    // Map zone to origin_zone and dest_zone for now
    const input = { ...request.body, origin_zone: request.body.zone, dest_zone: request.body.zone };
    console.log('Mapped input:', input);
    
    console.log('Calling Python inference...');
    const result = await callPythonInference(input);
    console.log('Python inference result:', result);
    
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
    
    console.error('Predict endpoint error:', error);
    console.error('Error stack:', error.stack);
    console.error('Input that caused error:', request.body);
    
    reply.code(500);
    return {
      success: false,
      error: `Inference failed: ${error.message}`,
      processing_time_ms: processingTime,
      debug: {
        errorType: error.constructor.name,
        stack: error.stack
      }
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
    const input = { ...request.body, origin_zone: request.body.zone, dest_zone: request.body.zone };
    const result = await callPythonInference(input);
    
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
    const input = { ...request.body, origin_zone: request.body.zone, dest_zone: request.body.zone };
    const result = await callPythonInference(input);
    
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

// Analytics endpoints
async function callAnalyticsWrapper(requestType, params = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      mode: 'text',
      pythonPath: path.join(__dirname, '..', '.venv', 'bin', 'python'),
      scriptPath: __dirname,
      args: [requestType, JSON.stringify(params)]
    };

    const pyshell = new PythonShell('analytics_wrapper.py', options);
    let output = '';

    pyshell.on('message', function (message) {
      output += message;
    });

    pyshell.end(function (err, code, signal) {
      if (err) {
        reject(err);
      } else {
        try {
          resolve(JSON.parse(output));
        } catch (parseErr) {
          reject(new Error(`Failed to parse analytics output: ${parseErr.message}`));
        }
      }
    });
  });
}

// Get service level summary statistics
fastify.get('/analytics/summary', async (request, reply) => {
  try {
    const result = await callAnalyticsWrapper('summary');
    return result;
  } catch (error) {
    fastify.log.error(error);
    return { success: false, error: error.message };
  }
});

// Get distribution statistics
fastify.get('/analytics/distributions', {
  schema: {
    querystring: {
      type: 'object',
      properties: {
        service_level: { type: 'string' },
        zone: { type: 'integer', minimum: 1, maximum: 9 }
      }
    }
  }
}, async (request, reply) => {
  try {
    const result = await callAnalyticsWrapper('distributions', request.query);
    return result;
  } catch (error) {
    fastify.log.error(error);
    return { success: false, error: error.message };
  }
});

// Compare service levels using 2-sigma analysis
fastify.get('/analytics/compare-2sigma', {
  schema: {
    querystring: {
      type: 'object',
      properties: {
        zones: { 
          type: 'array',
          items: { type: 'integer', minimum: 1, maximum: 9 }
        }
      }
    }
  }
}, async (request, reply) => {
  try {
    const result = await callAnalyticsWrapper('compare_2sigma', request.query);
    return result;
  } catch (error) {
    fastify.log.error(error);
    return { success: false, error: error.message };
  }
});

// Compare carriers' service levels within each zone
fastify.get('/analytics/compare-carriers', {
  schema: {
    querystring: {
      type: 'object',
      properties: {
        zones: { 
          type: 'array',
          items: { type: 'integer', minimum: 1, maximum: 9 }
        },
        metric: { 
          type: 'string', 
          enum: ['transit_time_days', 'shipping_cost_usd'],
          default: 'transit_time_days'
        }
      }
    }
  }
}, async (request, reply) => {
  try {
    const result = await callAnalyticsWrapper('compare_carriers', request.query);
    return result;
  } catch (error) {
    fastify.log.error(error);
    return { success: false, error: error.message };
  }
});

// Percentile-based service analysis
fastify.get('/analytics/percentile', {
  schema: {
    querystring: {
      type: 'object',
      properties: {
        percentile: { type: 'number', minimum: 1, maximum: 100 },
        method: { type: 'string', enum: ['mean', 'median'] },
        zones: { 
          type: 'array',
          items: { type: 'integer', minimum: 1, maximum: 9 }
        }
      }
    }
  }
}, async (request, reply) => {
  try {
    const params = {
      percentile: request.query.percentile || 80,
      method: request.query.method || 'median',
      zones: request.query.zones
    };
    const result = await callAnalyticsWrapper('percentile_analysis', params);
    return result;
  } catch (error) {
    fastify.log.error(error);
    return { success: false, error: error.message };
  }
});

// Get histogram data for charts
fastify.get('/analytics/histogram', {
  schema: {
    querystring: {
      type: 'object',
      required: ['service_level', 'zone'],
      properties: {
        service_level: { type: 'string' },
        zone: { type: 'integer', minimum: 1, maximum: 9 },
        metric: { type: 'string', enum: ['transit_time_days', 'shipping_cost_usd'] },
        bins: { type: 'integer', minimum: 10, maximum: 100 }
      }
    }
  }
}, async (request, reply) => {
  try {
    const params = {
      service_level: request.query.service_level,
      zone: request.query.zone,
      metric: request.query.metric || 'transit_time_days',
      bins: request.query.bins || 30
    };
    const result = await callAnalyticsWrapper('histogram', params);
    return result;
  } catch (error) {
    fastify.log.error(error);
    return { success: false, error: error.message };
  }
});

const start = async () => {
  try {
    const port = process.env.PORT || 3000;
    const host = process.env.HOST || '0.0.0.0';
    
    await fastify.listen({ port, host });
    
    console.log('\\n🚀 Fastify Inference Server Started!');
    console.log(`📡 Server listening on http://${host}:${port}`);
    console.log('\\n📋 Available endpoints:');
    console.log('  GET  /health                    - Health check');
    console.log('  GET  /models/info               - Model information');
    console.log('  GET  /sample-input              - Sample input format');
    console.log('  POST /predict                   - Predict both time and cost');
    console.log('  POST /predict/transit-time      - Predict transit time only');
    console.log('  POST /predict/shipping-cost     - Predict shipping cost only');
    console.log('  POST /predict/batch             - Batch predictions');
    console.log('\\n📊 Analytics endpoints:');
    console.log('  GET  /analytics/summary         - Service level statistics');
    console.log('  GET  /analytics/distributions   - Distribution statistics');
    console.log('  GET  /analytics/compare-2sigma  - 2-sigma service comparison');
    console.log('  GET  /analytics/compare-carriers - Carrier comparison by zone');
    console.log('  GET  /analytics/percentile      - Percentile-based analysis');
    console.log('  GET  /analytics/histogram       - Histogram data for charts');
    console.log('\\n🎯 Model info:');
    console.log(`  Transit Time Model: ${modelMetadata.transit_time_model.features} features`);
    console.log(`  Shipping Cost Model: ${modelMetadata.shipping_cost_model.features} features`);
    
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();