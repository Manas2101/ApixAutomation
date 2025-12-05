#!/usr/bin/env python3
"""
Simple Production Publishing Script
Publishes APIs to production by EIM ID (Excel Sheet Name)
"""

import os
import sys
import pandas as pd
import requests
import base64
import json
from datetime import datetime

# Configuration
PROD_PUBLISH_URL = 'https://apix.uk.hsbc/api/v1/publish/apis'
METAAPIX_FILENAME = 'apix-metadata.json'
EXCEL_FILE = 'API_MetaData.xlsx'  # Must be .xlsx for multiple sheets

# Proxy configuration
PROXIES = {
    'http': os.environ.get('HTTP_PROXY', os.environ.get('http_proxy')),
    'https': os.environ.get('HTTPS_PROXY', os.environ.get('https_proxy'))
}
PROXIES = {k: v for k, v in PROXIES.items() if v}
SSL_VERIFY = os.environ.get('SSL_VERIFY', 'true').lower() != 'false'


def parse_github_url(repo_url):
    """Parse GitHub repository URL to extract owner and repo name"""
    repo_url = repo_url.strip().rstrip('/')
    
    if repo_url.endswith('.git'):
        repo_url = repo_url[:-4]
    
    # HTTPS: https://github.com/owner/repo or https://alm-github.systems.uk.hsbc/owner/repo
    if 'github' in repo_url:
        parts = repo_url.split('/')
        if len(parts) >= 2:
            return {
                'owner': parts[-2],
                'repo': parts[-1],
                'base_url': '/'.join(parts[:-2])
            }
    
    # SSH: git@github.com:owner/repo
    if 'git@' in repo_url:
        parts = repo_url.split(':')[-1].split('/')
        if len(parts) >= 2:
            return {
                'owner': parts[0],
                'repo': parts[1],
                'base_url': 'https://github.com'
            }
    
    raise ValueError(f"Invalid GitHub URL: {repo_url}")


def fetch_metaapix_from_repo(repo_url, github_token, branch='main', silent=False):
    """Fetch metaapix.json from GitHub repository"""
    try:
        repo_info = parse_github_url(repo_url)
        owner = repo_info['owner']
        repo = repo_info['repo']
        
        # Determine API URL based on GitHub instance
        if 'alm-github.systems.uk.hsbc' in repo_url:
            api_url = f"https://alm-github.systems.uk.hsbc/api/v3/repos/{owner}/{repo}/contents/{METAAPIX_FILENAME}"
        else:
            api_url = f"https://api.github.com/repos/{owner}/{repo}/contents/{METAAPIX_FILENAME}"
        
        headers = {
            'Authorization': f'token {github_token}',
            'Accept': 'application/vnd.github.v3+json'
        }
        
        params = {'ref': branch}
        
        if not silent:
            print(f"    Fetching {METAAPIX_FILENAME} from {owner}/{repo}...", end=' ')
        
        response = requests.get(
            api_url,
            headers=headers,
            params=params,
            proxies=PROXIES if PROXIES else None,
            verify=SSL_VERIFY,
            timeout=30
        )
        
        if response.status_code == 404:
            if branch == 'main':
                if not silent:
                    print("trying master branch...", end=' ')
                return fetch_metaapix_from_repo(repo_url, github_token, branch='master', silent=silent)
            else:
                if not silent:
                    print("❌ NOT FOUND")
                return None
        
        response.raise_for_status()
        
        # Decode base64 content
        content_base64 = response.json().get('content', '')
        content = base64.b64decode(content_base64).decode('utf-8')
        metaapix_data = json.loads(content)
        
        if not silent:
            print("✅ FETCHED")
        return metaapix_data
        
    except Exception as e:
        if not silent:
            print(f"❌ ERROR: {str(e)}")
        return None


def preview_metadata(metaapix_data, show_full_json=False):
    """Display a preview of the metadata"""
    print("    📄 Metadata Preview:")
    
    # Handle nested structure - check if data is inside apixMetadata.list
    data = metaapix_data
    if 'apixMetadata' in metaapix_data and 'list' in metaapix_data['apixMetadata']:
        if isinstance(metaapix_data['apixMetadata']['list'], list) and len(metaapix_data['apixMetadata']['list']) > 0:
            data = metaapix_data['apixMetadata']['list'][0]
    
    # Show full JSON if requested
    if show_full_json:
        print("    📦 Full JSON Payload:")
        print(json.dumps(metaapix_data, indent=2))
        print()
    
    # Show key fields
    if 'apiTechnicalName' in data:
        print(f"       Technical Name: {data.get('apiTechnicalName', 'N/A')}")
    else:
        print(f"       Technical Name: N/A (field not found)")
        print(f"       Available fields: {list(data.keys())[:10]}")
    
    if 'version' in data:
        print(f"       Version: {data.get('version', 'N/A')}")
    
    if 'platform' in data:
        platform_info = data['platform']
        provider = platform_info.get('provider', 'N/A') if isinstance(platform_info, dict) else platform_info
        technology = platform_info.get('technology', 'N/A') if isinstance(platform_info, dict) else 'N/A'
        print(f"       Platform: {provider}")
        if technology != 'N/A':
            print(f"       Technology: {technology}")
    
    if 'team' in data:
        print(f"       Provider Team: {data.get('team', 'N/A')}")
    
    # Show total number of fields
    print(f"       Total Fields: {len(data)}")


def publish_to_production(metaapix_data, repo_url, eim_id, apix_token):
    """Publish API metadata to production"""
    headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Invocation-Source': f'UI_{eim_id}',
        'Authorization': apix_token
    }
    
    print(f"    Publishing to production...", end=' ')
    
    try:
        response = requests.post(
            PROD_PUBLISH_URL,
            json=metaapix_data,
            headers=headers,
            proxies=PROXIES if PROXIES else None,
            verify=SSL_VERIFY,
            timeout=60
        )
        
        if response.status_code == 200:
            print("✅ SUCCESS")
            return True
        else:
            error_msg = response.json() if response.text else response.text
            print(f"❌ FAILED (HTTP {response.status_code})")
            print(f"       Error: {error_msg}")
            return False
            
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        return False


def get_repos_from_sheet(eim_id, excel_file):
    """Get unique repository URLs from a specific Excel sheet (EIM ID = sheet name)"""
    try:
        # Load Excel file
        excel_data = pd.ExcelFile(excel_file, engine='openpyxl')
        
        # Check if sheet exists
        if eim_id not in excel_data.sheet_names:
            print(f"❌ Error: Sheet '{eim_id}' not found in {excel_file}")
            print(f"   Available sheets: {', '.join(excel_data.sheet_names)}")
            return []
        
        # Read the specific sheet (transposed format like dev app)
        df = pd.read_excel(excel_file, sheet_name=eim_id, engine='openpyxl', header=None)
        
        if df.empty or len(df.columns) < 2:
            print(f"❌ Error: Sheet '{eim_id}' is empty")
            return []
        
        # Transpose the data (first column is keys, rest are API data)
        df_transposed = df.set_index(0).T
        df_transposed.columns.name = None
        df_transposed = df_transposed.reset_index(drop=True)
        
        # Check for repository_url column
        if 'repository_url' not in df_transposed.columns:
            print(f"❌ Error: Column 'repository_url' not found in sheet '{eim_id}'")
            print(f"   Available columns: {', '.join(df_transposed.columns)}")
            return []
        
        # Get unique repository URLs
        repos = df_transposed['repository_url'].dropna().unique().tolist()
        
        print(f"✅ Found {len(repos)} unique repository URL(s) in sheet: {eim_id}")
        print(f"   Total APIs: {len(df_transposed)}")
        
        return repos
        
    except Exception as e:
        print(f"❌ Error reading Excel sheet: {e}")
        return []


def list_available_sheets(excel_file):
    """List all available sheets (EIM IDs) in the Excel file"""
    try:
        excel_data = pd.ExcelFile(excel_file, engine='openpyxl')
        return excel_data.sheet_names
    except Exception as e:
        print(f"❌ Error reading Excel file: {e}")
        return []


def preview_all_apis(repos, github_token, eim_id):
    """Preview all APIs that will be published"""
    print()
    print("=" * 80)
    print("📋 PREVIEW: APIs to be Published to PRODUCTION")
    print("=" * 80)
    print(f"EIM ID: {eim_id}")
    print(f"Target: {PROD_PUBLISH_URL}")
    print(f"Total Repositories: {len(repos)}")
    print()
    
    api_previews = []
    
    for i, repo_url in enumerate(repos, 1):
        print(f"[{i}/{len(repos)}] {repo_url}")
        
        # Fetch metadata silently for preview
        metaapix_data = fetch_metaapix_from_repo(repo_url, github_token, silent=True)
        
        if metaapix_data:
            # Handle nested structure
            data = metaapix_data
            if 'apixMetadata' in metaapix_data and 'list' in metaapix_data['apixMetadata']:
                if isinstance(metaapix_data['apixMetadata']['list'], list) and len(metaapix_data['apixMetadata']['list']) > 0:
                    data = metaapix_data['apixMetadata']['list'][0]
            
            api_name = data.get('apiTechnicalName', 'N/A')
            version = data.get('version', 'N/A')
            platform = data.get('platform', {})
            platform_provider = platform.get('provider', 'N/A') if isinstance(platform, dict) else platform
            
            print(f"    ✅ API: {api_name} | Version: {version} | Platform: {platform_provider}")
            api_previews.append({
                'repo': repo_url,
                'data': metaapix_data,
                'name': api_name
            })
        else:
            print(f"    ❌ Failed to fetch metadata")
            api_previews.append({
                'repo': repo_url,
                'data': None,
                'name': 'ERROR'
            })
    
    print("=" * 80)
    return api_previews


def confirm_publish():
    """Ask user for confirmation before publishing to production"""
    print()
    print("⚠️  WARNING: You are about to publish to PRODUCTION!")
    print()
    
    response = input("Do you want to continue? (yes/no): ").strip().lower()
    
    if response in ['yes', 'y']:
        return True
    elif response in ['no', 'n']:
        print("\n❌ Publishing cancelled by user")
        return False
    else:
        print("\n❌ Invalid response. Please enter 'yes' or 'no'")
        return confirm_publish()


def main():
    print("=" * 80)
    print("Production API Publishing by EIM ID (Excel Sheet)")
    print("=" * 80)
    print()
    
    # Check environment variables
    github_token = os.environ.get('GITHUB_TOKEN')
    apix_token = os.environ.get('APIX_VALIDATION_TOKEN')
    
    if not github_token:
        print("❌ Error: GITHUB_TOKEN environment variable not set")
        print("   Set it with: export GITHUB_TOKEN='your_token'")
        sys.exit(1)
    
    if not apix_token:
        print("❌ Error: APIX_VALIDATION_TOKEN environment variable not set")
        print("   Set it with: export APIX_VALIDATION_TOKEN='your_token'")
        sys.exit(1)
    
    # Check if Excel file exists
    if not os.path.exists(EXCEL_FILE):
        print(f"❌ Error: Excel file not found: {EXCEL_FILE}")
        sys.exit(1)
    
    # List available sheets
    available_sheets = list_available_sheets(EXCEL_FILE)
    
    if not available_sheets:
        print(f"❌ Error: No sheets found in {EXCEL_FILE}")
        sys.exit(1)
    
    print(f"📁 Excel File: {EXCEL_FILE}")
    print(f"📋 Available EIM IDs (sheets): {', '.join(available_sheets)}")
    print()
    
    # Get EIM ID from user
    if len(sys.argv) > 1:
        eim_id = sys.argv[1]
    else:
        eim_id = input(f"Enter EIM ID (sheet name): ").strip()
    
    if not eim_id:
        print("❌ Error: EIM ID is required")
        sys.exit(1)
    
    print()
    print(f"🎯 EIM ID (Sheet): {eim_id}")
    print(f"🌐 Target: {PROD_PUBLISH_URL}")
    print(f"📤 Invocation-Source: UI_{eim_id}")
    print()
    
    # Get repositories from the sheet
    repos = get_repos_from_sheet(eim_id, EXCEL_FILE)
    
    if not repos:
        sys.exit(1)
    
    # Preview all APIs
    api_previews = preview_all_apis(repos, github_token, eim_id)
    
    # Ask for confirmation
    if not confirm_publish():
        sys.exit(0)
    
    print()
    print("-" * 80)
    print("Starting Publication Process")
    print("-" * 80)
    print()
    
    # Process each repository
    successful = 0
    failed = 0
    
    for i, preview in enumerate(api_previews, 1):
        repo_url = preview['repo']
        metaapix_data = preview['data']
        
        print(f"[{i}/{len(api_previews)}] {repo_url}")
        
        if metaapix_data is None:
            print(f"    ❌ Skipping - metadata not available")
            failed += 1
            print()
            continue
        
        # Show preview (set show_full_json=True to see complete payload)
        preview_metadata(metaapix_data, show_full_json=True)
        
        # Publish to production
        success = publish_to_production(metaapix_data, repo_url, eim_id, apix_token)
        
        if success:
            successful += 1
        else:
            failed += 1
        
        print()
    
    # Summary
    print("=" * 80)
    print("SUMMARY")
    print("=" * 80)
    print(f"EIM ID (Sheet): {eim_id}")
    print(f"Total Repositories: {len(repos)}")
    print(f"✅ Successful: {successful}")
    print(f"❌ Failed: {failed}")
    
    if successful == len(repos):
        print(f"\n🎉 All APIs published successfully!")
    elif successful > 0:
        print(f"\n⚠️  {failed} API(s) failed to publish")
    else:
        print(f"\n❌ All APIs failed to publish")
    
    print("=" * 80)
    
    # Exit with error code if any failed
    sys.exit(0 if failed == 0 else 1)


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Operation cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        sys.exit(1)
