import requests
import pandas as pd
from io import BytesIO
import os


def fetch_excel_from_github(repo_owner, repo_name, file_path, branch="main", github_base_url=None, token=None):
    """
    Fetches an Excel file from GitHub (including Enterprise) and returns parsed data.
    Handles transposed format where rows are field names and columns are records.
    
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
    
    if 'github.com' in github_base_url and 'alm-github' not in github_base_url:
        raw_url = f"https://raw.githubusercontent.com/{repo_owner}/{repo_name}/{branch}/{file_path}"
    else:
        # GitHub Enterprise format: {base_url}/{owner}/{repo}/raw/{branch}/{path}
        raw_url = f"{github_base_url}/{repo_owner}/{repo_name}/raw/{branch}/{file_path}"
    
    print(f"Fetching Excel from: {raw_url}")
    
    # Setup headers with authentication
    headers = {
        'User-Agent': 'apix-automation-tool',
        'Accept': 'application/octet-stream, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, */*'
    }
    
    # Add authentication if token is provided
    if token:
        # Support both old (token) and new (Bearer) GitHub auth formats
        if token.startswith('ghp_') or token.startswith('github_pat_'):
            headers['Authorization'] = f'Bearer {token}'
        else:
            headers['Authorization'] = f'token {token}'
        print("Using GitHub token authentication")
    else:
        print("WARNING: No GitHub token provided - authentication may fail for private repos")
    
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
    
    response = requests.get(raw_url, headers=headers, proxies=proxies if proxies else None, verify=ssl_verify)
    response.raise_for_status()
    
    # Check if we got HTML instead of binary Excel file
    content_type = response.headers.get('Content-Type', '')
    print(f"Response Content-Type: {content_type}")
    
    # Check first bytes to detect HTML response
    first_bytes = response.content[:100]
    if b'<!DOCTYPE' in first_bytes or b'<html' in first_bytes.lower():
        raise ValueError(
            f"Received HTML instead of Excel file. The URL may be incorrect.\n"
            f"URL used: {raw_url}\n"
            f"Try accessing this URL directly in your browser to verify it returns the raw file."
        )
    
    excel_file = BytesIO(response.content)
    
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
