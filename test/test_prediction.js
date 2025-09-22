const fetch = require('node-fetch');

async function testPrediction() {
  const testData = {
    ship_date: "2024-01-15",
    origin_zone: 1,
    dest_zone: 5,
    carrier: "USPS",
    service_level: "Ground",
    package_weight_lbs: 2.5,
    package_length_in: 12.0,
    package_width_in: 8.0,
    package_height_in: 6.0,
    insurance_value: 100.0
  };

  try {
    console.log('Testing prediction with data:', JSON.stringify(testData, null, 2));
    
    const response = await fetch('http://localhost:3000/predict', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });

    const result = await response.json();
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

testPrediction();