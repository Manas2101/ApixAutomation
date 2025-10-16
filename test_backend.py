#!/usr/bin/env python3
"""Quick test script to verify backend functionality"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from app import load_api_data, find_api_by_repo, normalize_repo_url

print("=" * 60)
print("Testing APIX Backend")
print("=" * 60)

# Test 1: Load CSV
print("\n1. Testing CSV loading...")
df = load_api_data()
if df is not None:
    print(f"✅ Successfully loaded {len(df)} rows")
    print(f"   Columns: {df.columns.tolist()}")
else:
    print("❌ Failed to load CSV")
    sys.exit(1)

# Test 2: Show available URLs
print("\n2. Available repository URLs in database:")
for idx, url in enumerate(df['repository_url'].tolist(), 1):
    print(f"   {idx}. {url}")

# Test 3: Test normalization
print("\n3. Testing URL normalization:")
test_urls = [
    "https://github.com/example/payment-api",
    "https://github.com/example/payment-api/",
    "https://github.com/example/payment-api.git",
]
for url in test_urls:
    normalized = normalize_repo_url(url)
    print(f"   {url}")
    print(f"   → {normalized}")

# Test 4: Test search
print("\n4. Testing repository search:")
test_repo = "https://github.com/example/payment-api"
print(f"   Searching for: {test_repo}")
result = find_api_by_repo(test_repo)
if result:
    print(f"   ✅ Found: {result['api_technical_name']}")
    print(f"      Version: {result['version']}")
    print(f"      Platform: {result['platform']}")
else:
    print(f"   ❌ Not found")

print("\n" + "=" * 60)
print("Test complete!")
print("=" * 60)
