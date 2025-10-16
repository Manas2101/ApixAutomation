#!/usr/bin/env python3
"""Test script to debug PR creation issues"""

import requests
import json

# Configuration
BACKEND_URL = "http://localhost:5001"
REPO_URL = "https://github.com/Manas2101/Portfolio"

# Get your token from user input
print("=" * 60)
print("PR Creation Debug Test")
print("=" * 60)
github_token = input("\nEnter your GitHub Personal Access Token: ").strip()

if not github_token:
    print("Error: Token is required")
    exit(1)

# Step 1: Search for API data
print(f"\n1. Searching for repository: {REPO_URL}")
search_response = requests.post(
    f"{BACKEND_URL}/api/search",
    json={"repository_url": REPO_URL}
)
print(f"   Status: {search_response.status_code}")
if search_response.status_code == 200:
    print(f"   ✓ Repository found in database")
    api_data = search_response.json()['data']
else:
    print(f"   ✗ Error: {search_response.json()}")
    exit(1)

# Step 2: Generate YAML
print(f"\n2. Generating YAML file")
yaml_response = requests.post(
    f"{BACKEND_URL}/api/generate-yaml",
    json={"repository_url": REPO_URL}
)
print(f"   Status: {yaml_response.status_code}")
if yaml_response.status_code == 200:
    print(f"   ✓ YAML generated successfully")
    yaml_content = yaml_response.json()['yaml']
    print(f"\n   YAML Preview:")
    print("   " + "-" * 50)
    for line in yaml_content.split('\n')[:10]:
        print(f"   {line}")
    print("   " + "-" * 50)
else:
    print(f"   ✗ Error: {yaml_response.json()}")
    exit(1)

# Step 3: Create PR
print(f"\n3. Creating Pull Request")
pr_response = requests.post(
    f"{BACKEND_URL}/api/create-pr",
    json={
        "repository_url": REPO_URL,
        "yaml_content": yaml_content,
        "github_token": github_token
    }
)
print(f"   Status: {pr_response.status_code}")
print(f"   Response: {json.dumps(pr_response.json(), indent=2)}")

if pr_response.status_code == 200:
    print(f"\n   ✓ SUCCESS! PR created")
    print(f"   PR URL: {pr_response.json()['pr_url']}")
else:
    print(f"\n   ✗ FAILED")
    print(f"\n   Error Details:")
    error_data = pr_response.json()
    for key, value in error_data.items():
        print(f"   - {key}: {value}")

print("\n" + "=" * 60)
