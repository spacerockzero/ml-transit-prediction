import Fastify from 'fastify';
import cors from '@fastify/cors';
import { readFileSync, existsSync, statSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec, spawn } from 'child_process';
import { PythonShell } from 'python-shell';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Analytics Cache System
class AnalyticsCache {
  constructor() {
    this.cache = new Map();
    this.cacheTimestamps = new Map();
    this.dataFileHashes = new Map();
    this.defaultTTL = 1000 * 60 * 30; // 30 minutes default TTL
    this.staticEndpointTTL = 1000 * 60 * 60 * 2; // 2 hours for static data
  }

  // Generate cache key for request
  generateCacheKey(requestType, params = {}) {
    // Handle both object params and array params
    const normalizedParams = Array.isArray(params) ? params : [params];
    const keyData = { requestType, params: normalizedParams };
    return crypto.createHash('md5').update(JSON.stringify(keyData)).digest('hex');
  }

  // Get file hash for invalidation detection
  getFileHash(filePath) {
    try {
      if (!existsSync(filePath)) return null;
      const stats = statSync(filePath);
      const content = readFileSync(filePath);
      return crypto.createHash('md5').update(content + stats.mtime.toISOString()).digest('hex');
    } catch (error) {
      console.error(`Error hashing file ${filePath}:`, error);
      return null;
    }
  }

  // Check if data files have been updated
  hasDataFilesChanged() {
    const dataFiles = [
      path.join(__dirname, '..', 'statistical_analysis', 'statistical_shipping_data.csv'),
      path.join(__dirname, '..', 'statistical_analysis', 'statistical_shipping_data.parquet'),
      path.join(__dirname, '..', 'transit_time', 'historical_shipments.csv'),
      path.join(__dirname, '..', 'transit_time_cost', 'historical_shipments.csv'),
      path.join(__dirname, '..', 'transit_time_zones', 'historical_shipments.csv'),
    ];

    for (const filePath of dataFiles) {
      const currentHash = this.getFileHash(filePath);
      const cachedHash = this.dataFileHashes.get(filePath);

      if (currentHash && currentHash !== cachedHash) {
        this.dataFileHashes.set(filePath, currentHash);
        return true;
      }
    }
    return false;
  }

  // Get TTL based on request type
  getTTL(requestType) {
    // Static endpoints that rarely change
    if (['summary', 'carrier_summary', 'carrier_zone_summary'].includes(requestType)) {
      return this.staticEndpointTTL;
    }
    // Dynamic endpoints with parameters
    return this.defaultTTL;
  }

  // Set cache entry
  set(key, value, requestType) {
    const ttl = this.getTTL(requestType);
    this.cache.set(key, value);
    this.cacheTimestamps.set(key, Date.now() + ttl);
  }

  // Get cache entry
  get(key) {
    const timestamp = this.cacheTimestamps.get(key);
    if (!timestamp || Date.now() > timestamp) {
      this.cache.delete(key);
      this.cacheTimestamps.delete(key);
      return null;
    }
    return this.cache.get(key);
  }

  // Clear all cache
  clear() {
    this.cache.clear();
    this.cacheTimestamps.clear();
    console.log('Analytics cache cleared due to data file changes');
  }

  // Initialize data file hashes
  initializeHashes() {
    console.log('Initializing analytics cache with current data file hashes...');
    this.hasDataFilesChanged(); // This will set initial hashes
  }

  // Get cache stats
  getStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
      dataFileHashes: Object.fromEntries(this.dataFileHashes)
    };
  }
}

// Prediction Cache Class
class PredictionCache {
  constructor() {
    this.cache = new Map();
    this.cacheTimestamps = new Map();
    this.modelFileHashes = new Map();
    this.defaultTTL = 1000 * 60 * 60 * 24; // 24 hours for predictions (they don't change unless model updates)
  }

  // Generate cache key for prediction request
  generateCacheKey(input) {
    // Create a normalized version of the input for consistent hashing
    const normalizedInput = {
      ship_date: input.ship_date,
      zone: input.zone,
      carrier: input.carrier,
      service_level: input.service_level,
      package_weight_lbs: Number(input.package_weight_lbs),
      package_length_in: Number(input.package_length_in),
      package_width_in: Number(input.package_width_in),
      package_height_in: Number(input.package_height_in),
      insurance_value: Number(input.insurance_value)
    };
    return crypto.createHash('md5').update(JSON.stringify(normalizedInput)).digest('hex');
  }

  // Get file hash for model invalidation detection
  getFileHash(filePath) {
    try {
      if (!existsSync(filePath)) return null;
      const stats = statSync(filePath);
      const content = readFileSync(filePath);
      return crypto.createHash('md5').update(content + stats.mtime.toISOString()).digest('hex');
    } catch (error) {
      console.error(`Error hashing file ${filePath}:`, error);
      return null;
    }
  }

  // Check if model files have been updated
  hasModelFilesChanged() {
    const modelFiles = [
      // Transit time models
      path.join(__dirname, '..', 'transit_time', 'lgb_transit_model.txt'),
      path.join(__dirname, '..', 'transit_time', 'lgb_transit_quantile_10.txt'),
      path.join(__dirname, '..', 'transit_time', 'lgb_transit_quantile_50.txt'),
      path.join(__dirname, '..', 'transit_time', 'lgb_transit_quantile_90.txt'),
      path.join(__dirname, '..', 'transit_time', 'feature_cols.joblib'),

      // Transit time cost models
      path.join(__dirname, '..', 'transit_time_cost', 'lgb_transit_model.txt'),
      path.join(__dirname, '..', 'transit_time_cost', 'lgb_transit_quantile_10.txt'),
      path.join(__dirname, '..', 'transit_time_cost', 'lgb_transit_quantile_50.txt'),
      path.join(__dirname, '..', 'transit_time_cost', 'lgb_transit_quantile_90.txt'),
      path.join(__dirname, '..', 'transit_time_cost', 'lgb_shipping_cost_model.txt'),
      path.join(__dirname, '..', 'transit_time_cost', 'lgb_shipping_cost_quantile_10.txt'),
      path.join(__dirname, '..', 'transit_time_cost', 'lgb_shipping_cost_quantile_50.txt'),
      path.join(__dirname, '..', 'transit_time_cost', 'lgb_shipping_cost_quantile_90.txt'),
      path.join(__dirname, '..', 'transit_time_cost', 'lgb_transit_time_model.txt'),
      path.join(__dirname, '..', 'transit_time_cost', 'lgb_transit_time_quantile_10.txt'),
      path.join(__dirname, '..', 'transit_time_cost', 'lgb_transit_time_quantile_50.txt'),
      path.join(__dirname, '..', 'transit_time_cost', 'lgb_transit_time_quantile_90.txt'),
      path.join(__dirname, '..', 'transit_time_cost', 'feature_cols.joblib'),
      path.join(__dirname, '..', 'transit_time_cost', 'cost_feature_cols.joblib'),
      path.join(__dirname, '..', 'transit_time_cost', 'time_feature_cols.joblib'),
      path.join(__dirname, '..', 'transit_time_cost', 'target_encoding_priors.joblib'),
      path.join(__dirname, '..', 'transit_time_cost', 'target_encodings_cost.joblib'),
      path.join(__dirname, '..', 'transit_time_cost', 'target_encodings_time.joblib'),

      // Transit time zones models
      path.join(__dirname, '..', 'transit_time_zones', 'lgb_transit_model.txt'),
      path.join(__dirname, '..', 'transit_time_zones', 'lgb_transit_quantile_10.txt'),
      path.join(__dirname, '..', 'transit_time_zones', 'lgb_transit_quantile_50.txt'),
      path.join(__dirname, '..', 'transit_time_zones', 'lgb_transit_quantile_90.txt'),
      path.join(__dirname, '..', 'transit_time_zones', 'feature_cols.joblib'),
    ];

    let hasChanged = false;
    for (const filePath of modelFiles) {
      const currentHash = this.getFileHash(filePath);
      const cachedHash = this.modelFileHashes.get(filePath);

      if (currentHash && cachedHash && currentHash !== cachedHash) {
        console.log(`Model file changed: ${filePath}`);
        this.modelFileHashes.set(filePath, currentHash);
        hasChanged = true;
      } else if (currentHash && !cachedHash) {
        // Initial setup - set hash but don't mark as changed
        this.modelFileHashes.set(filePath, currentHash);
      }
    }
    return hasChanged;
  }

  // Set cache entry
  set(key, value) {
    this.cache.set(key, value);
    this.cacheTimestamps.set(key, Date.now() + this.defaultTTL);
  }

  // Get cache entry
  get(key) {
    const timestamp = this.cacheTimestamps.get(key);
    if (!timestamp || Date.now() > timestamp) {
      this.cache.delete(key);
      this.cacheTimestamps.delete(key);
      return null;
    }
    return this.cache.get(key);
  }

  // Clear all cache
  clear() {
    this.cache.clear();
    this.cacheTimestamps.clear();
    console.log('Prediction cache cleared due to model file changes');
  }

  // Initialize model file hashes
  initializeHashes() {
    console.log('Initializing prediction cache with current model file hashes...');
    this.hasModelFilesChanged(); // This will set initial hashes
  }

  // Get cache stats
  getStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
      modelFileHashes: Object.fromEntries(this.modelFileHashes)
    };
  }
}

// Initialize caches
const analyticsCache = new AnalyticsCache();
const predictionCache = new PredictionCache();

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

// Response time tracking
class ResponseTimeTracker {
  constructor(maxEntries = 1000) {
    this.responseTimes = [];
    this.maxEntries = maxEntries;
    this.totalRequests = 0;
  }

  addResponseTime(timeMs) {
    this.responseTimes.push(timeMs);
    this.totalRequests++;

    // Keep only the most recent entries to prevent memory issues
    if (this.responseTimes.length > this.maxEntries) {
      this.responseTimes = this.responseTimes.slice(-this.maxEntries);
    }
  }

  getStats() {
    if (this.responseTimes.length === 0) {
      return {
        averageMs: 0,
        medianMs: 0,
        minMs: 0,
        maxMs: 0,
        totalRequests: this.totalRequests,
        recentSamples: 0
      };
    }

    const sorted = [...this.responseTimes].sort((a, b) => a - b);
    const sum = this.responseTimes.reduce((acc, time) => acc + time, 0);

    return {
      averageMs: Math.round(sum / this.responseTimes.length),
      medianMs: Math.round(sorted[Math.floor(sorted.length / 2)]),
      minMs: Math.round(Math.min(...this.responseTimes)),
      maxMs: Math.round(Math.max(...this.responseTimes)),
      totalRequests: this.totalRequests,
      recentSamples: this.responseTimes.length
    };
  }
}

const responseTracker = new ResponseTimeTracker();

// Daily prediction tracking
class DailyPredictionTracker {
  constructor() {
    this.dailyStats = new Map(); // Map<date, count>
    this.totalPredictions = 0;
  }

  addPrediction() {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    this.totalPredictions++;

    if (this.dailyStats.has(today)) {
      this.dailyStats.set(today, this.dailyStats.get(today) + 1);
    } else {
      this.dailyStats.set(today, 1);
    }

    // Clean up old entries (keep only last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoffDate = thirtyDaysAgo.toISOString().split('T')[0];

    for (const [date] of this.dailyStats) {
      if (date < cutoffDate) {
        this.dailyStats.delete(date);
      }
    }
  }

  getTodayCount() {
    const today = new Date().toISOString().split('T')[0];
    return this.dailyStats.get(today) || 0;
  }

  getStats() {
    const today = new Date().toISOString().split('T')[0];
    const todayCount = this.getTodayCount();

    // Calculate some additional metrics
    const dailyCounts = Array.from(this.dailyStats.values());
    const avgDaily = dailyCounts.length > 0
      ? Math.round(dailyCounts.reduce((sum, count) => sum + count, 0) / dailyCounts.length)
      : 0;

    return {
      today: todayCount,
      total: this.totalPredictions,
      averageDaily: avgDaily,
      activeDays: this.dailyStats.size,
      date: today
    };
  }
}

const predictionTracker = new DailyPredictionTracker();

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

// Response time stats endpoint
fastify.get('/stats/response-times', async (request, reply) => {
  return {
    success: true,
    data: responseTracker.getStats(),
    timestamp: new Date().toISOString()
  };
});

// Daily predictions stats endpoint
fastify.get('/stats/predictions', async (request, reply) => {
  return {
    success: true,
    data: predictionTracker.getStats(),
    timestamp: new Date().toISOString()
  };
});

// Training metadata endpoint
fastify.get('/stats/training', async (request, reply) => {
  try {
    const trainingMetadataPath = path.join(__dirname, '..', 'training_metadata.json');

    if (existsSync(trainingMetadataPath)) {
      const trainingData = JSON.parse(readFileSync(trainingMetadataPath, 'utf8'));
      return {
        success: true,
        data: trainingData,
        timestamp: new Date().toISOString()
      };
    } else {
      // Return default metadata if file doesn't exist
      return {
        success: true,
        data: {
          last_updated: "2024-01-01T00:00:00Z",
          training_data: {
            total_shipments: 0,
            date_range: { start: "2023-01-01", end: "2024-12-31" },
            carriers: [],
            service_levels: [],
            zones_covered: []
          },
          model_info: {
            version: "1.0.0",
            training_duration_minutes: 0,
            features_count: 17,
            validation_accuracy: {
              transit_time_mae: 0.0,
              shipping_cost_mae: 0.0
            }
          },
          data_sources: []
        },
        timestamp: new Date().toISOString()
      };
    }
  } catch (error) {
    reply.code(500);
    return {
      success: false,
      error: `Failed to load training metadata: ${error.message}`,
      timestamp: new Date().toISOString()
    };
  }
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
    // Check if model files have changed and invalidate cache if so
    if (predictionCache.hasModelFilesChanged()) {
      predictionCache.clear();
    }

    // Map zone to origin_zone and dest_zone for now
    const input = { ...request.body, origin_zone: request.body.zone, dest_zone: request.body.zone };
    console.log('Mapped input:', input);

    // Generate cache key from input parameters
    const cacheKey = predictionCache.generateCacheKey(input);
    console.log('Generated prediction cache key:', cacheKey);

    // Check cache first
    const cachedResult = predictionCache.get(cacheKey);
    if (cachedResult) {
      const processingTime = Date.now() - startTime;
      console.log('✅ Prediction cache hit! Returning cached result');

      // Track cache hit response time and prediction count
      responseTracker.addResponseTime(processingTime);
      predictionTracker.addPrediction();

      return {
        ...cachedResult,
        processing_time_ms: processingTime,
        cached: true
      };
    }

    console.log('⏳ Prediction cache miss, calling Python inference...');
    const result = await callPythonInference(input);
    console.log('Python inference result:', result);

    const processingTime = Date.now() - startTime;

    if (result.success) {
      // Cache the successful result (exclude processing_time_ms from cache)
      const cacheableResult = {
        success: result.success,
        predictions: result.predictions,
        input: result.input
      };
      predictionCache.set(cacheKey, cacheableResult);
      console.log('💾 Cached prediction result for future requests');

      // Track successful response time and prediction count
      responseTracker.addResponseTime(processingTime);
      predictionTracker.addPrediction();

      return {
        ...result,
        processing_time_ms: processingTime,
        cached: false
      };
    } else {
      // Still track response time for failed predictions, but don't cache errors
      responseTracker.addResponseTime(processingTime);

      reply.code(400);
      return {
        success: false,
        error: result.error,
        processing_time_ms: processingTime,
        cached: false
      };
    }
  } catch (error) {
    const processingTime = Date.now() - startTime;

    console.error('Predict endpoint error:', error);
    console.error('Error stack:', error.stack);
    console.error('Input that caused error:', request.body);

    // Track response time even for errors
    responseTracker.addResponseTime(processingTime);

    reply.code(500);
    return {
      success: false,
      error: `Inference failed: ${error.message}`,
      processing_time_ms: processingTime,
      debug: {
        errorType: error.constructor.name,
        stack: error.stack
      },
      cached: false
    };
  }
});

// Transit time only endpoint
fastify.post('/predict/transit-time', {
  schema: {
    body: predictionInputSchema
  }
}, async (request, reply) => {
  const startTime = Date.now();

  try {
    const input = { ...request.body, origin_zone: request.body.zone, dest_zone: request.body.zone };
    const result = await callPythonInference(input);

    const processingTime = Date.now() - startTime;
    responseTracker.addResponseTime(processingTime);

    if (result.success) {
      predictionTracker.addPrediction();

      return {
        success: true,
        transit_time_days: result.predictions.transit_time_days,
        input: result.input,
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
    responseTracker.addResponseTime(processingTime);

    reply.code(500);
    return {
      success: false,
      error: `Inference failed: ${error.message}`,
      processing_time_ms: processingTime
    };
  }
});

// Shipping cost only endpoint
fastify.post('/predict/shipping-cost', {
  schema: {
    body: predictionInputSchema
  }
}, async (request, reply) => {
  const startTime = Date.now();

  try {
    const input = { ...request.body, origin_zone: request.body.zone, dest_zone: request.body.zone };
    const result = await callPythonInference(input);

    const processingTime = Date.now() - startTime;
    responseTracker.addResponseTime(processingTime);

    if (result.success) {
      predictionTracker.addPrediction();

      return {
        success: true,
        shipping_cost_usd: result.predictions.shipping_cost_usd,
        input: result.input,
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
    responseTracker.addResponseTime(processingTime);

    reply.code(500);
    return {
      success: false,
      error: `Inference failed: ${error.message}`,
      processing_time_ms: processingTime
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
    responseTracker.addResponseTime(processingTime);

    // Count successful predictions for daily tracking
    const successfulPredictions = results.filter(result => result.success).length;
    for (let i = 0; i < successfulPredictions; i++) {
      predictionTracker.addPrediction();
    }

    return {
      success: true,
      count: results.length,
      successfulCount: successfulPredictions,
      results: results,
      processing_time_ms: processingTime
    };
  } catch (error) {
    const processingTime = Date.now() - startTime;
    responseTracker.addResponseTime(processingTime);

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
async function callAnalyticsWrapper(requestType, ...params) {
  // Check if data files have changed and clear cache if needed
  if (analyticsCache.hasDataFilesChanged()) {
    analyticsCache.clear();
  }

  // Generate cache key
  const cacheKey = analyticsCache.generateCacheKey(requestType, params);

  console.log(`🔍 Cache lookup: ${requestType}`, {
    params,
    cacheKey: cacheKey.substring(0, 8) + '...'
  });

  // Try to get from cache first
  const cachedResult = analyticsCache.get(cacheKey);
  if (cachedResult) {
    console.log(`✅ Cache HIT for ${requestType}`);
    return cachedResult;
  }

  console.log(`❌ Cache MISS for ${requestType}`);

  // Use spawn with uv for better performance than PythonShell
  return new Promise((resolve, reject) => {
    const args = [requestType, ...params.map(p => typeof p === 'object' ? JSON.stringify(p) : String(p))];

    const pythonProcess = spawn('uv', ['run', 'python', 'analytics_wrapper.py', ...args], {
      cwd: __dirname,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    let errorOutput = '';

    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Python process exited with code ${code}. Error: ${errorOutput}`));
      } else {
        try {
          const result = JSON.parse(output);
          // Cache the successful result
          analyticsCache.set(cacheKey, result, requestType);
          console.log(`💾 Cached result for ${requestType} (key: ${cacheKey.substring(0, 8)}...)`);
          resolve(result);
        } catch (parseErr) {
          reject(new Error(`Failed to parse analytics output: ${parseErr.message}. Raw output: ${output}`));
        }
      }
    });

    pythonProcess.on('error', (error) => {
      reject(new Error(`Failed to start Python process: ${error.message}`));
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

// Get carrier-service summary statistics
fastify.get('/analytics/carrier-summary', async (request, reply) => {
  try {
    const result = await callAnalyticsWrapper('carrier_summary');
    return result;
  } catch (error) {
    fastify.log.error(error);
    return { success: false, error: error.message };
  }
});

// Get carrier-zone-service summary statistics
fastify.get('/analytics/carrier-zone-summary', async (request, reply) => {
  try {
    const result = await callAnalyticsWrapper('carrier_zone_summary');
    return result;
  } catch (error) {
    fastify.log.error(error);
    return { success: false, error: error.message };
  }
});

// Get percentile-filtered carrier-zone-service summary statistics
fastify.get('/analytics/carrier-zone-summary-percentile', {
  schema: {
    querystring: {
      type: 'object',
      properties: {
        percentile: { type: 'number', default: 50 },
        method: { type: 'string', default: 'median' }
      }
    }
  }
}, async (request, reply) => {
  try {
    const percentile = request.query.percentile || 50;
    const method = request.query.method || 'median';
    const result = await callAnalyticsWrapper('carrier_zone_summary_percentile', percentile, method);
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

// Advanced Analytics endpoints
// Temporal patterns analysis
fastify.get('/analytics/temporal-patterns', async (request, reply) => {
  try {
    const result = await callAnalyticsWrapper('temporal_patterns');
    return result;
  } catch (error) {
    fastify.log.error(error);
    return { success: false, error: error.message };
  }
});

// Geographic intelligence analysis
fastify.get('/analytics/geographic-intelligence', async (request, reply) => {
  try {
    const result = await callAnalyticsWrapper('geographic_intelligence');
    return result;
  } catch (error) {
    fastify.log.error(error);
    return { success: false, error: error.message };
  }
});

// Package analytics
fastify.get('/analytics/package-analytics', async (request, reply) => {
  try {
    const result = await callAnalyticsWrapper('package_analytics');
    return result;
  } catch (error) {
    fastify.log.error(error);
    return { success: false, error: error.message };
  }
});

// Performance benchmarking
fastify.get('/analytics/performance-benchmarking', async (request, reply) => {
  try {
    const result = await callAnalyticsWrapper('performance_benchmarking');
    return result;
  } catch (error) {
    fastify.log.error(error);
    return { success: false, error: error.message };
  }
});

// Customer segmentation analysis
fastify.get('/analytics/customer-segmentation', async (request, reply) => {
  try {
    const result = await callAnalyticsWrapper('customer_segmentation');
    return result;
  } catch (error) {
    fastify.log.error(error);
    return { success: false, error: error.message };
  }
});

// Anomaly detection
fastify.get('/analytics/anomaly-detection', async (request, reply) => {
  try {
    const result = await callAnalyticsWrapper('anomaly_detection');
    return result;
  } catch (error) {
    fastify.log.error(error);
    return { success: false, error: error.message };
  }
});

// Predictive insights
fastify.get('/analytics/predictive-insights', async (request, reply) => {
  try {
    const result = await callAnalyticsWrapper('predictive_insights');
    return result;
  } catch (error) {
    fastify.log.error(error);
    return { success: false, error: error.message };
  }
});

// Comprehensive analytics report
fastify.get('/analytics/comprehensive-report', async (request, reply) => {
  try {
    const result = await callAnalyticsWrapper('comprehensive_report');
    return result;
  } catch (error) {
    fastify.log.error(error);
    return { success: false, error: error.message };
  }
});

// Cache management endpoints
fastify.get('/cache/stats', async (request, reply) => {
  return {
    success: true,
    data: {
      analytics: analyticsCache.getStats(),
      predictions: predictionCache.getStats()
    }
  };
});

// Alternative endpoint for backward compatibility
fastify.get('/analytics/cache-stats', async (request, reply) => {
  return {
    success: true,
    data: analyticsCache.getStats()
  };
});

fastify.post('/cache/clear', async (request, reply) => {
  analyticsCache.clear();
  predictionCache.clear();
  return {
    success: true,
    message: 'Analytics and prediction caches cleared successfully'
  };
});

fastify.post('/cache/refresh', async (request, reply) => {
  try {
    analyticsCache.clear();
    predictionCache.clear();
    await preWarmCache();
    return {
      success: true,
      message: 'Caches refreshed successfully',
      stats: {
        analytics: analyticsCache.getStats(),
        predictions: predictionCache.getStats()
      }
    };
  } catch (error) {
    fastify.log.error('Error refreshing cache:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

// Pre-warm cache with frequently used endpoints
async function preWarmCache() {
  console.log('🔄 Pre-warming analytics cache...');

  const preWarmTasks = [
    // Static endpoints
    () => callAnalyticsWrapper('summary'),
    () => callAnalyticsWrapper('carrier_summary'),
    () => callAnalyticsWrapper('carrier_zone_summary'),

    // Common percentile queries
    () => callAnalyticsWrapper('carrier_zone_summary_percentile', 50, 'median'),
    () => callAnalyticsWrapper('carrier_zone_summary_percentile', 80, 'median'),
    () => callAnalyticsWrapper('carrier_zone_summary_percentile', 90, 'median'),
    () => callAnalyticsWrapper('percentile_analysis', { percentile: 50, method: 'median', service_level: 'EXPRESS', zone: 5 }),
    () => callAnalyticsWrapper('percentile_analysis', { percentile: 80, method: 'median', service_level: 'EXPRESS', zone: 5 }),

    // Common histogram queries for distributions page
    () => callAnalyticsWrapper('histogram', { service_level: 'EXPRESS', zone: 5, metric: 'transit_time_days', bins: 30 }),
    () => callAnalyticsWrapper('histogram', { service_level: 'EXPRESS', zone: 5, metric: 'shipping_cost_usd', bins: 30 }),
    () => callAnalyticsWrapper('histogram', { service_level: 'OVERNIGHT', zone: 5, metric: 'transit_time_days', bins: 30 }),
    () => callAnalyticsWrapper('histogram', { service_level: 'STANDARD', zone: 3, metric: 'transit_time_days', bins: 30 }),
    () => callAnalyticsWrapper('histogram', { service_level: 'PRIORITY', zone: 7, metric: 'transit_time_days', bins: 30 }),
  ];

  let successCount = 0;
  const total = preWarmTasks.length;

  for (const task of preWarmTasks) {
    try {
      await task();
      successCount++;
    } catch (error) {
      console.warn('Pre-warm task failed:', error.message);
    }
  }

  console.log(`✅ Cache pre-warming completed: ${successCount}/${total} tasks successful`);
  console.log(`📊 Cache stats:`, {
    analytics: analyticsCache.getStats(),
    predictions: predictionCache.getStats()
  });
}

const start = async () => {
  try {
    // Initialize caches and check for file changes
    analyticsCache.initializeHashes();
    predictionCache.initializeHashes();

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
    console.log('\\n🗄️  Cache management:');
    console.log('  GET  /cache/stats               - Cache statistics');
    console.log('  POST /cache/clear               - Clear cache');
    console.log('  POST /cache/refresh             - Refresh and pre-warm cache');
    console.log('\\n🎯 Model info (using transit_time_cost models):');
    console.log(`  Transit Time Component: ${modelMetadata.transit_time_model.features} features`);
    console.log(`  Shipping Cost Component: ${modelMetadata.shipping_cost_model.features} features`);

    // Pre-warm cache in the background
    setImmediate(() => {
      preWarmCache().catch(error => {
        console.warn('Cache pre-warming failed:', error.message);
      });
    });

  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
