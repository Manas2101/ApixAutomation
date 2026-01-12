import requests
import pandas as pd
from io import BytesIO
import os
import base64


def fetch_excel_from_github(repo_owner, repo_name, file_path, branch="main", github_base_url=None, token=None):
    """
    Fetches an Excel file from GitHub (including Enterprise) and returns parsed data.
    Handles transposed format where rows are field names and columns are records.
    Uses GitHub API with base64 decoding (proven working approach from app.py)
    
    Args:
        repo_owner: GitHub repository owner/organization name
        repo_name: Repository name
        file_path: Path to the Excel file within the repository
        branch: Branch name (default: "main")
        github_base_url: Base URL for GitHub Enterprise (e.g., "https://alm-github.systems.uk.hsbc")
        token: GitHub token for authentication (required for private repos/Enterprise)
    
    Returns:
        Parsed data in the same format as parse_transposed_excel() - dict grouped by repo URL
    """
    if github_base_url is None:
        github_base_url = os.environ.get('GITHUB_API_BASE', 'https://github.com')
    
    # Get token from parameter or environment
    if token is None:
        token = os.environ.get('GITHUB_TOKEN') or os.environ.get('SERVICE_GITHUB_TOKEN')
    
    github_base_url = github_base_url.rstrip('/')
    repo = f"{repo_owner}/{repo_name}"
    
    print(f"Fetching Excel from GitHub: {repo}/{file_path} (branch: {branch})")
    
    # Determine GitHub API base URL
    if 'alm-github.systems.uk.hsbc' in github_base_url:
        api_url = f"{github_base_url}/repos/{repo}/contents/{file_path}"
    else:
        api_url = f"https://api.github.com/repos/{repo}/contents/{file_path}"
    
    headers = {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'apix-automation-tool'
    }
    
    # Add authentication if token provided
    if token:
        headers['Authorization'] = f'Bearer {token}' if token.startswith('ghp_') or token.startswith('github_pat_') else f'token {token}'
        print("Using GitHub token authentication")
    else:
        print("WARNING: No GitHub token provided")
    
    params = {'ref': branch}
    
    proxies = {
        'http': os.environ.get('HTTP_PROXY', os.environ.get('http_proxy')),
        'https': os.environ.get('HTTPS_PROXY', os.environ.get('https_proxy'))
    }
    proxies = {k: v for k, v in proxies.items() if v is not None}
    
    ssl_verify = os.environ.get('SSL_VERIFY', 'true').lower() != 'false'
    ssl_cert_path = os.environ.get('SSL_CERT_PATH', None)
    
    if not ssl_verify:
        import urllib3
        urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
    elif ssl_cert_path:
        ssl_verify = ssl_cert_path
    
    try:
        response = requests.get(
            api_url,
            headers=headers,
            params=params,
            proxies=proxies if proxies else None,
            verify=ssl_verify,
            timeout=30
        )
        
        response.raise_for_status()
        
        # GitHub API returns file content as base64
        response_data = response.json()
        
        if 'content' not in response_data:
            raise ValueError(f"No content field in GitHub API response. File might be too large or not found.")
        
        # Decode base64 content
        file_content = base64.b64decode(response_data['content'])
        
        print(f"Successfully fetched Excel file from GitHub ({len(file_content)} bytes)")
        
        excel_file = BytesIO(file_content)
        
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 404:
            raise Exception(f"Excel file not found in GitHub: {repo}/{file_path} (branch: {branch})")
        elif e.response.status_code == 403:
            raise Exception(f"Access denied to GitHub repository. Check token permissions or repository visibility.")
        else:
            raise Exception(f"GitHub API error ({e.response.status_code}): {str(e)}")
    except requests.exceptions.RequestException as e:
        raise Exception(f"Failed to fetch Excel from GitHub: {str(e)}")
    except Exception as e:
        raise Exception(f"Error processing GitHub Excel file: {str(e)}")
    
    excel_data = pd.ExcelFile(excel_file, engine='openpyxl')
    
    if len(excel_data.sheet_names) > 1:
        print(f"Multi-sheet Excel detected, parsing transposed format")
        return parse_transposed_excel_from_memory(excel_file)
    else:
        df = pd.read_excel(excel_file, engine='openpyxl')
        print(f"Single-sheet Excel loaded: {len(df)} rows")
        return df


def parse_transposed_excel_from_memory(excel_file):
    """
    Parse transposed Excel format from BytesIO object.
    Same logic as parse_transposed_excel but works with in-memory file.
    """
    from collections import defaultdict
    
    excel_data = pd.ExcelFile(excel_file, engine='openpyxl')
    all_apis = []
    
    print(f"\n=== Parsing Transposed Excel ===")
    print(f"Found {len(excel_data.sheet_names)} sheets: {excel_data.sheet_names}")
    
    field_mapping = {
        'API Repo': 'repository_url',
        'apiId': 'repository_url',
        'API Object/API Technical Name': 'api_technical_name',
        'version': 'version',
        'apiContractURL': 'api_contract_url',
        'businessApplicationID': 'snow_business_application_id',
        'applicationServiceId': 'snow_application_service_id',
        'classification': 'classification',
        'sourceCode.pathToSource': 'source_code_path',
        'SourceCodeURL': 'source_code_url',
        'SourceCode Reference': 'source_code_reference',
        'Platform.provider': 'platform_provider',
        'Platform.technology': 'platform_technology',
        'Platform.team': 'platform_team',
        'lifecycleStatus': 'lifecycle_status',
        'consumers': 'consumers',
        'consumers[].applicationServiceId': 'consumer_application_service_ids',
        'gatewayType': 'gateway_type',
        'proxyURL': 'gateway_proxy_url',
        'configURL': 'gateway_config_url',
        'apiHostingCountry': 'api_hosting_country',
        'documentationURL': 'documentation_url',
        'consumingCountryGroups': 'consuming_country_groups',
        'countryCode': 'consuming_country_code',
        'groupMemberCode': 'consuming_group_member_code',
        'Application Name': 'application_name'
    }
    
    for sheet_name in excel_data.sheet_names:
        print(f"\n--- Processing sheet: {sheet_name} ---")
        df = pd.read_excel(excel_file, sheet_name=sheet_name, engine='openpyxl', header=None)
        
        if df.empty or len(df.columns) < 2:
            print(f"Skipping empty sheet: {sheet_name}")
            continue
        
        eim_id = sheet_name.strip()
        field_names = df.iloc[:, 0].tolist()
        num_apis = len(df.columns) - 1
        print(f"Found {num_apis} API columns")
        
        for col_idx in range(1, len(df.columns)):
            api_data = {}
            api_values = df.iloc[:, col_idx].tolist()
            
            for field_name, value in zip(field_names, api_values):
                if pd.notna(field_name) and pd.notna(value):
                    field_name_clean = str(field_name).strip()
                    internal_field = field_mapping.get(field_name_clean, field_name_clean.lower().replace(' ', '_'))
                    api_data[internal_field] = value
            
            if 'repository_url' in api_data and api_data['repository_url']:
                api_data['eim_id'] = eim_id
                all_apis.append(api_data)
                print(f"  API {col_idx}: {api_data.get('api_technical_name', 'N/A')} -> {api_data.get('repository_url', 'N/A')} (EIM: {eim_id})")
    
    print(f"\n=== Total APIs parsed: {len(all_apis)} ===")
    
    grouped_by_repo = defaultdict(list)
    for api in all_apis:
        repo_url = normalize_repo_url(api['repository_url'])
        grouped_by_repo[repo_url].append(api)
    
    print(f"\n=== Grouped into {len(grouped_by_repo)} unique repositories ===")
    for repo_url, apis in grouped_by_repo.items():
        print(f"  {repo_url}: {len(apis)} API(s)")
    
    return dict(grouped_by_repo)


def normalize_repo_url(url):
    """Normalize GitHub repository URL for comparison"""
    if not url:
        return ""
    url = str(url).strip().lower()
    url = url.rstrip('/')
    if url.endswith('.git'):
        url = url[:-4]
    return url
