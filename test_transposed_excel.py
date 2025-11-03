#!/usr/bin/env python3
"""Test transposed Excel parser"""

import sys
sys.path.insert(0, 'backend')

from backend.app import parse_transposed_excel

# Test with a sample Excel file
excel_file = input("Enter path to transposed Excel file: ")

print("\n" + "="*70)
print("Testing Transposed Excel Parser")
print("="*70)

result = parse_transposed_excel(excel_file)

if result:
    print(f"\n✓ Successfully parsed!")
    print(f"\nSummary:")
    print(f"  - Total unique repositories: {len(result)}")
    print(f"  - Total APIs: {sum(len(apis) for apis in result.values())}")
    
    print(f"\nRepositories:")
    for repo_url, apis in result.items():
        print(f"\n  📦 {repo_url}")
        print(f"     APIs: {len(apis)}")
        for i, api in enumerate(apis, 1):
            api_name = api.get('api_technical_name', 'N/A')
            version = api.get('version', 'N/A')
            print(f"       {i}. {api_name} (v{version})")
else:
    print("\n✗ Failed to parse Excel file")
