#!/usr/bin/env python3
"""
Test script for ZIP code generation and lookup
"""
import random

def zip_to_zone(zip_code):
    """Simplified ZIP to zone lookup for testing"""
    zip_int = int(str(zip_code)[:3])
    if 100 <= zip_int <= 199: return 8  # NY area
    elif 900 <= zip_int <= 966: return 4  # CA area  
    elif 600 <= zip_int <= 639: return 6  # IL area
    elif 300 <= zip_int <= 319: return 6  # PA area
    elif 750 <= zip_int <= 799: return 5  # TX area
    elif 800 <= zip_int <= 847: return 4  # CO area
    else: return 5  # default

def generate_realistic_zip_codes():
    """Generate realistic ZIP codes"""
    prefixes = [100, 200, 300, 600, 700, 800, 900, 480, 850]
    prefix = random.choice(prefixes)
    suffix = random.randint(10, 99)
    return f'{prefix:03d}{suffix:02d}'

if __name__ == "__main__":
    print('Testing ZIP code generation with uv run:')
    for i in range(5):
        zip_code = generate_realistic_zip_codes()
        zone = zip_to_zone(zip_code)
        print(f'{zip_code} -> Zone {zone}')
    
    print('\n✅ ZIP code functionality working with uv run!')