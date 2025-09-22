#!/usr/bin/env python3
import requests
import json

test_data = {
    "ship_date": "2024-01-15",
    "origin_zone": 1,
    "dest_zone": 5,
    "carrier": "USPS",
    "service_level": "Ground",
    "package_weight_lbs": 2.5,
    "package_length_in": 12.0,
    "package_width_in": 8.0,
    "package_height_in": 6.0,
    "insurance_value": 100.0
}

print("Testing prediction with:", json.dumps(test_data, indent=2))
try:
    response = requests.post("http://localhost:3000/predict", json=test_data)
    print("Status:", response.status_code)
    print("Result:", json.dumps(response.json(), indent=2))
except Exception as e:
    print("Error:", e)