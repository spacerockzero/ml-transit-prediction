import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test configuration
const SERVER_URL = 'http://localhost:3000';

// Load sample input
const sampleInputPath = path.join(__dirname, 'onnx_models', 'sample_input.json');
let sampleInput = JSON.parse(readFileSync(sampleInputPath, 'utf8'));
// Patch for zone field only
if (sampleInput.origin_zone !== undefined || sampleInput.dest_zone !== undefined) {
  sampleInput.zone = sampleInput.origin_zone || sampleInput.dest_zone;
  delete sampleInput.origin_zone;
  delete sampleInput.dest_zone;
}

console.log('🧪 Testing Fastify ONNX Server\\n');

// Helper function to make HTTP requests
async function makeRequest(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  try {
    const response = await fetch(`${SERVER_URL}${endpoint}`, options);
    const data = await response.json();
    
    return {
      status: response.status,
      data,
      success: response.ok
    };
  } catch (error) {
    return {
      status: 0,
      error: error.message,
      success: false
    };
  }
}

// Test cases
async function runTests() {
  console.log('1. Testing health endpoint...');
  const healthCheck = await makeRequest('/health');
  if (healthCheck.success) {
    console.log('   ✅ Health check passed');
    console.log(`   📊 Status: ${healthCheck.data.status}`);
  } else {
    console.log('   ❌ Health check failed');
    console.log(`   Error: ${healthCheck.error || healthCheck.data?.error}`);
    return;
  }
  
  console.log('\\n2. Testing model info endpoint...');
  const modelInfo = await makeRequest('/models/info');
  if (modelInfo.success) {
    console.log('   ✅ Model info retrieved');
    console.log(`   🧠 Transit Time Features: ${modelInfo.data.metadata.transit_time_model.num_features}`);
    console.log(`   💰 Shipping Cost Features: ${modelInfo.data.metadata.shipping_cost_model.num_features}`);
  } else {
    console.log('   ❌ Model info failed');
  }
  
  console.log('\\n3. Testing sample input endpoint...');
  const sampleEndpoint = await makeRequest('/sample-input');
  if (sampleEndpoint.success) {
    console.log('   ✅ Sample input retrieved');
  } else {
    console.log('   ❌ Sample input failed');
  }
  
  console.log('\\n4. Testing main prediction endpoint...');
  console.log(`   📦 Input: ${JSON.stringify(sampleInput, null, 2)}`);
  
  const prediction = await makeRequest('/predict', 'POST', sampleInput);
  if (prediction.success) {
    console.log('   ✅ Prediction successful');
    console.log(`   ⏱️  Transit Time: ${prediction.data.predictions.transit_time_days} days`);
    console.log(`   💵 Shipping Cost: $${prediction.data.predictions.shipping_cost_usd}`);
    console.log(`   🚀 Processing Time: ${prediction.data.processing_time_ms}ms`);
  } else {
    console.log('   ❌ Prediction failed');
    console.log(`   Error: ${prediction.error || prediction.data?.error}`);
  }
  
  console.log('\\n5. Testing transit time only endpoint...');
  const transitTime = await makeRequest('/predict/transit-time', 'POST', sampleInput);
  if (transitTime.success) {
    console.log('   ✅ Transit time prediction successful');
    console.log(`   ⏱️  Transit Time: ${transitTime.data.transit_time_days} days`);
  } else {
    console.log('   ❌ Transit time prediction failed');
  }
  
  console.log('\\n6. Testing shipping cost only endpoint...');
  const shippingCost = await makeRequest('/predict/shipping-cost', 'POST', sampleInput);
  if (shippingCost.success) {
    console.log('   ✅ Shipping cost prediction successful');
    console.log(`   💵 Shipping Cost: $${shippingCost.data.shipping_cost_usd}`);
  } else {
    console.log('   ❌ Shipping cost prediction failed');
  }
  
  console.log('\\n7. Testing batch prediction endpoint...');
  const batchInput = {
    predictions: [
      { ...sampleInput, origin_zone: 'Zone_1', dest_zone: 'Zone_9' },
      { ...sampleInput, origin_zone: 'Zone_2', dest_zone: 'Zone_6' },
      { ...sampleInput, package_weight_lbs: 10.0 }
    ]
  };
  
  const batchPrediction = await makeRequest('/predict/batch', 'POST', batchInput);
  if (batchPrediction.success) {
    console.log('   ✅ Batch prediction successful');
    console.log(`   📊 Processed ${batchPrediction.data.count} predictions`);
    console.log(`   🚀 Total Processing Time: ${batchPrediction.data.processing_time_ms}ms`);
    
    batchPrediction.data.results.forEach((result, index) => {
      if (result.success) {
        console.log(`     ${index + 1}. Time: ${result.predictions.transit_time_days}d, Cost: $${result.predictions.shipping_cost_usd}`);
      }
    });
  } else {
    console.log('   ❌ Batch prediction failed');
  }
  
  console.log('\\n8. Testing error handling...');
  const invalidInput = { ...sampleInput };
  delete invalidInput.ship_date; // Remove required field
  
  const errorTest = await makeRequest('/predict', 'POST', invalidInput);
  if (!errorTest.success && errorTest.status === 400) {
    console.log('   ✅ Error handling working correctly');
    console.log('   📝 Validation errors caught as expected');
  } else {
    console.log('   ❌ Error handling not working properly');
  }
  
  console.log('\\n🎉 Test suite completed!');
  console.log('\\n💡 Try these curl commands to test manually:');
  console.log(`curl -X GET ${SERVER_URL}/health`);
  console.log(`curl -X POST ${SERVER_URL}/predict \\\\`);
  console.log(`  -H "Content-Type: application/json" \\\\`);
  console.log(`  -d '${JSON.stringify(sampleInput)}'`);
}

// Run tests if server is available
console.log(`Waiting for server at ${SERVER_URL}...\\n`);

// Give server time to start if running concurrently
setTimeout(runTests, 2000);