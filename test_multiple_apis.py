#!/usr/bin/env python3
"""Test multiple APIs per repository enhancement"""

import requests
import json

BACKEND_URL = "http://localhost:5001"
TEST_REPO = "https://alm-github.systems.uk.hsbc/45453684/Jenkins-mcp"

print("=" * 60)
print("Testing Multiple APIs Per Repository")
print("=" * 60)

# Test 1: Search for repository with multiple APIs
print(f"\n1. Searching for: {TEST_REPO}")
response = requests.post(
    f"{BACKEND_URL}/api/search",
    json={"repository_url": TEST_REPO}
)

print(f"   Status: {response.status_code}")
if response.status_code == 200:
    data = response.json()
    print(f"   ✓ Found: {data['found']}")
    print(f"   ✓ Count: {data['count']} APIs")
    print(f"\n   APIs found:")
    for i, api in enumerate(data['data'], 1):
        print(f"     {i}. {api['api_technical_name']} (v{api['version']})")
        if 'description' in api:
            print(f"        Description: {api['description']}")
        print(f"        Platform: {api['platform']}")
        print(f"        Classification: {api['classification']}")
else:
    print(f"   ✗ Error: {response.json()}")
    exit(1)

# Test 2: Generate YAML for multiple APIs
print(f"\n2. Generating YAML for multiple APIs")
response = requests.post(
    f"{BACKEND_URL}/api/generate-yaml",
    json={"repository_url": TEST_REPO}
)

print(f"   Status: {response.status_code}")
if response.status_code == 200:
    yaml_content = response.json()['yaml']
    print(f"   ✓ YAML generated successfully")
    
    # Count YAML documents (separated by ---)
    doc_count = yaml_content.count('---') + 1 if '---' in yaml_content else 1
    print(f"   ✓ Contains {doc_count} YAML document(s)")
    
    print(f"\n   YAML Preview (first 500 chars):")
    print("   " + "-" * 50)
    for line in yaml_content[:500].split('\n'):
        print(f"   {line}")
    print("   " + "-" * 50)
    
    # Save to file
    with open('test_multiple_apis_output.yaml', 'w') as f:
        f.write(yaml_content)
    print(f"\n   ✓ Full YAML saved to: test_multiple_apis_output.yaml")
else:
    print(f"   ✗ Error: {response.json()}")
    exit(1)

print("\n" + "=" * 60)
print("✓ All tests passed!")
print("=" * 60)
