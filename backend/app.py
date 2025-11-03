from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import yaml
import os
import requests
from datetime import datetime
import base64
from collections import defaultdict
 
app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*", "methods": ["GET", "POST", "OPTIONS"], "allow_headers": ["Content-Type"]}})

# Proxy configuration - reads from environment variables
PROXIES = {
    'http': os.environ.get('HTTP_PROXY', os.environ.get('http_proxy')),
    'https': os.environ.get('HTTPS_PROXY', os.environ.get('https_proxy'))
}
# Remove None values
PROXIES = {k: v for k, v in PROXIES.items() if v is not None}
print(f"Using proxies: {PROXIES if PROXIES else 'None (direct connection)'}")

# SSL Certificate configuration for GitHub Enterprise
SSL_VERIFY = os.environ.get('SSL_VERIFY', 'true').lower() != 'false'
SSL_CERT_PATH = os.environ.get('SSL_CERT_PATH', None)

if not SSL_VERIFY:
    print("WARNING: SSL verification is DISABLED")
    import urllib3
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
elif SSL_CERT_PATH:
    print(f"Using custom SSL certificate: {SSL_CERT_PATH}")
    SSL_VERIFY = SSL_CERT_PATH

# GitHub Enterprise configuration
GITHUB_API_BASE = os.environ.get('GITHUB_API_BASE', 'https://api.github.com')
print(f"GitHub API Base URL: {GITHUB_API_BASE}")

# Path to the Excel/CSV file - supports both .csv and .xlsx
DATA_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'API_MetaData.xlsx')

def load_api_data():
    """
    Load API data from CSV or Excel file
    - For CSV: Load normally (old format)
    - For Excel: Try transposed format first, fallback to normal format
    Returns: DataFrame or dict of grouped APIs
    """
    try:
        print(f"Loading data from: {DATA_FILE}")
        
        # Detect file type and load accordingly
        file_extension = os.path.splitext(DATA_FILE)[1].lower()
        
        if file_extension == '.csv':
            df = pd.read_csv(DATA_FILE)
            print(f"Loaded {len(df)} rows from CSV")
            return df
        elif file_extension in ['.xlsx', '.xls']:
            # Try transposed format first (multi-sheet)
            try:
                excel_file = pd.ExcelFile(DATA_FILE, engine='openpyxl')
                # If multiple sheets, assume transposed format
                if len(excel_file.sheet_names) > 1:
                    print(f"Detected multi-sheet Excel (transposed format)")
                    grouped_data = parse_transposed_excel(DATA_FILE)
                    if grouped_data:
                        return grouped_data  # Returns dict: {repo_url: [apis]}
            except Exception as e:
                print(f"Not transposed format, trying normal format: {e}")
            
            # Fallback to normal single-sheet format
            df = pd.read_excel(DATA_FILE, engine='openpyxl')
            print(f"Loaded {len(df)} rows from Excel (normal format)")
            return df
        else:
            print(f"Unsupported file format: {file_extension}")
            return None
        
    except Exception as e:
        print(f"Error loading data: {e}")
        return None

def parse_transposed_excel(file_path):
    """
    Parse transposed Excel format where:
    - Each sheet represents an EMI ID (for reference)
    - Column A = Field names (vertical)
    - Columns B, C, D... = Different APIs (horizontal)
    - Returns dict grouped by repository URL
    """
    try:
        excel_file = pd.ExcelFile(file_path, engine='openpyxl')
        all_apis = []
        
        print(f"\n=== Parsing Transposed Excel ===")
        print(f"Found {len(excel_file.sheet_names)} sheets: {excel_file.sheet_names}")
        
        # Field name mapping from Excel to our internal structure
        field_mapping = {
            'API Repo': 'repository_url',
            'apiId': 'repository_url',  # Alternative name
            'API Object/API Technical Name': 'api_technical_name',
            'version': 'version',
            'apiContractURL': 'api_contract_url',
            'businessApplicationID': 'snow_business_application_id',
            'applicationServiceId': 'snow_application_service_id',
            'classification': 'classification',
            'sourceCode.pathToSource': 'source_code_path',
            'Platform.provider': 'gateway_type',
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
        
        for sheet_name in excel_file.sheet_names:
            print(f"\n--- Processing sheet: {sheet_name} ---")
            df = pd.read_excel(file_path, sheet_name=sheet_name, engine='openpyxl', header=None)
            
            if df.empty or len(df.columns) < 2:
                print(f"Skipping empty sheet: {sheet_name}")
                continue
            
            # Column A (index 0) contains field names
            # Columns B onwards (index 1+) contain API data
            field_names = df.iloc[:, 0].tolist()
            
            # Process each API column (starting from column B = index 1)
            num_apis = len(df.columns) - 1
            print(f"Found {num_apis} API columns")
            
            for col_idx in range(1, len(df.columns)):
                api_data = {}
                api_values = df.iloc[:, col_idx].tolist()
                
                # Map field names to values
                for field_name, value in zip(field_names, api_values):
                    if pd.notna(field_name) and pd.notna(value):
                        field_name_clean = str(field_name).strip()
                        
                        # Map to internal field name
                        internal_field = field_mapping.get(field_name_clean, field_name_clean.lower().replace(' ', '_'))
                        api_data[internal_field] = value
                
                # Only add if we have a repository URL
                if 'repository_url' in api_data and api_data['repository_url']:
                    all_apis.append(api_data)
                    print(f"  API {col_idx}: {api_data.get('api_technical_name', 'N/A')} -> {api_data.get('repository_url', 'N/A')}")
        
        print(f"\n=== Total APIs parsed: {len(all_apis)} ===")
        
        # Group APIs by repository URL
        grouped_by_repo = defaultdict(list)
        for api in all_apis:
            repo_url = normalize_repo_url(api['repository_url'])
            grouped_by_repo[repo_url].append(api)
        
        print(f"\n=== Grouped into {len(grouped_by_repo)} unique repositories ===")
        for repo_url, apis in grouped_by_repo.items():
            print(f"  {repo_url}: {len(apis)} API(s)")
        
        return dict(grouped_by_repo)
        
    except Exception as e:
        print(f"Error parsing transposed Excel: {e}")
        import traceback
        traceback.print_exc()
        return None

def normalize_repo_url(url):
    """Normalize GitHub repository URL for comparison"""
    if not url:
        return ""
    url = str(url).strip().lower()
    # Remove trailing slashes
    url = url.rstrip('/')
    # Remove .git suffix if present
    if url.endswith('.git'):
        url = url[:-4]
    return url

def find_api_by_repo(repo_url):
    """Find API data by repository URL - returns list of all APIs in the repo"""
    data = load_api_data()
    if data is None:
        return None
    
    normalized_input = normalize_repo_url(repo_url)
    print(f"Searching for normalized URL: {normalized_input}")
    
    # Check if data is dict (transposed format) or DataFrame (normal format)
    if isinstance(data, dict):
        print("Using transposed Excel format (dict)")
        # Data is already grouped by repo URL
        if normalized_input in data:
            apis = data[normalized_input]
            print(f"Found {len(apis)} API(s) in transposed data")
            return apis
        else:
            print(f"Repository not found in transposed data")
            print(f"Available repos: {list(data.keys())}")
            return None
    
    # Handle DataFrame (old CSV/Excel format)
    df = data
    
    # Check if repository_url column exists
    if 'repository_url' not in df.columns:
        print(f"ERROR: 'repository_url' column not found in data file")
        print(f"Available columns: {df.columns.tolist()}")
        return None
    
    # Normalize all repository URLs in the dataframe
    df['normalized_url'] = df['repository_url'].apply(normalize_repo_url)
    print(f"Available URLs in database:")
    for url in df['normalized_url'].tolist():
        print(f"  - {url}")
    
    # Find all matching rows (multiple APIs per repo)
    matching_rows = df[df['normalized_url'] == normalized_input]
    print(f"Found {len(matching_rows)} API(s) for this repository")
    
    if len(matching_rows) > 0:
        # Return list of all APIs in this repository
        apis = []
        for idx, row in matching_rows.iterrows():
            api_dict = {
                'repository_url': row['repository_url'],
                'api_technical_name': row['api_technical_name'],
                'version': row['version'],
                'snow_business_application_id': row['snow_business_application_id'],
                'platform': row['platform'],
                'lifecycle_status': row['lifecycle_status'],
                'classification': row['classification'],
            }
            
            # Add new optional fields if they exist
            optional_fields = [
                'snow_application_service_id',
                'api_contract_url',
                'documentation_url',
                'api_hosting_country',
                'gateway_type',
                'gateway_proxy_url',
                'gateway_config_url',
                'consumer_application_service_ids',
                'consuming_country_code',
                'consuming_group_member_code',
                'description',
                'owner_team',
                'contact_email'
            ]
            
            for field in optional_fields:
                if field in row and pd.notna(row[field]):
                    api_dict[field] = row[field]
            
            apis.append(api_dict)
        return apis
    
    return None

def is_valid_value(value):
    """Check if a value is valid (not empty, not NaN, not None)"""
    if value is None:
        return False
    if pd.isna(value):
        return False
    if isinstance(value, str) and value.strip() == '':
        return False
    return True

def generate_apix_yaml(api_data_list):
    """Generate APIX YAML content from API data (supports multiple APIs)"""
    # If single API (for backward compatibility), convert to list
    if isinstance(api_data_list, dict):
        api_data_list = [api_data_list]
    
    # Generate YAML for multiple APIs
    yaml_documents = []
    
    for api_data in api_data_list:
        # Build the YAML structure with only required fields first
        apix_content = {}
        
        # Required fields - always include
        apix_content['apiTechnicalName'] = api_data.get('api_technical_name', 'unknown')
        apix_content['version'] = api_data.get('version', '1.0.0')
        
        # Optional core fields - only add if valid
        if is_valid_value(api_data.get('classification')):
            apix_content['classification'] = api_data['classification']
        
        if is_valid_value(api_data.get('platform')):
            apix_content['platform'] = api_data['platform']
        
        if is_valid_value(api_data.get('lifecycle_status')):
            apix_content['lifecycleStatus'] = api_data['lifecycle_status']
        
        # Add optional URL fields
        if is_valid_value(api_data.get('api_contract_url')):
            apix_content['apiContractUrl'] = api_data['api_contract_url']
        
        if is_valid_value(api_data.get('documentation_url')):
            apix_content['documentationUrl'] = api_data['documentation_url']
        
        if is_valid_value(api_data.get('api_hosting_country')):
            apix_content['apiHostingCountry'] = api_data['api_hosting_country']
        
        # SNOW data section - only add if business app ID exists
        if is_valid_value(api_data.get('snow_business_application_id')):
            snow_data = {
                'businessApplicationId': api_data['snow_business_application_id']
            }
            if is_valid_value(api_data.get('snow_application_service_id')):
                snow_data['applicationServiceId'] = api_data['snow_application_service_id']
            apix_content['snowData'] = snow_data
        
        # Gateway section - only add if gateway type exists
        if is_valid_value(api_data.get('gateway_type')):
            gateway = {
                'gatewayType': api_data['gateway_type']
            }
            if is_valid_value(api_data.get('gateway_proxy_url')):
                gateway['proxyUrl'] = api_data['gateway_proxy_url']
            if is_valid_value(api_data.get('gateway_config_url')):
                gateway['configUrl'] = api_data['gateway_config_url']
            apix_content['gateway'] = gateway
        
        # Consumers section - only add if consumer IDs exist
        if is_valid_value(api_data.get('consumer_application_service_ids')):
            consumer_ids = api_data['consumer_application_service_ids']
            # Handle comma-separated list
            if isinstance(consumer_ids, str):
                consumer_ids = [id.strip() for id in consumer_ids.split(',') if id.strip()]
            elif not isinstance(consumer_ids, list):
                consumer_ids = [consumer_ids]
            
            if consumer_ids:  # Only add if list is not empty
                apix_content['consumers'] = [
                    {'applicationServiceId': consumer_id} for consumer_id in consumer_ids
                ]
        
        # Consuming country groups section - only add if both country and group codes exist
        if is_valid_value(api_data.get('consuming_country_code')) and is_valid_value(api_data.get('consuming_group_member_code')):
            country_codes = api_data['consuming_country_code']
            group_codes = api_data['consuming_group_member_code']
            
            # Handle comma-separated lists
            if isinstance(country_codes, str):
                country_codes = [c.strip() for c in country_codes.split(',') if c.strip()]
            elif not isinstance(country_codes, list):
                country_codes = [country_codes]
            
            if isinstance(group_codes, str):
                group_codes = [g.strip() for g in group_codes.split(',') if g.strip()]
            elif not isinstance(group_codes, list):
                group_codes = [group_codes]
            
            if country_codes and group_codes:  # Only add if both lists are not empty
                apix_content['consumingCountryGroups'] = [
                    {
                        'countryCode': country_codes[i] if i < len(country_codes) else country_codes[0],
                        'groupMemberCode': group_codes[i] if i < len(group_codes) else group_codes[0]
                    }
                    for i in range(max(len(country_codes), len(group_codes)))
                ]
        
        yaml_documents.append(apix_content)
    
    # Generate YAML with document separator for multiple APIs
    if len(yaml_documents) == 1:
        return yaml.dump(yaml_documents[0], default_flow_style=False, sort_keys=False)
    else:
        # Multiple documents separated by ---
        yaml_parts = []
        for doc in yaml_documents:
            yaml_parts.append(yaml.dump(doc, default_flow_style=False, sort_keys=False))
        return '---\n' + '\n---\n'.join(yaml_parts)

@app.route('/api/search', methods=['POST'])
def search_api():
    """Search for API data by repository URL - returns all APIs in the repo"""
    data = request.json
    repo_url = data.get('repository_url', '')
    
    if not repo_url:
        return jsonify({'error': 'Repository URL is required'}), 400
    
    api_data_list = find_api_by_repo(repo_url)
    
    if api_data_list:
        return jsonify({
            'found': True,
            'count': len(api_data_list),
            'data': api_data_list  # Now returns array of APIs
        })
    else:
        return jsonify({
            'found': False,
            'message': 'No API data found for this repository'
        }), 404

@app.route('/api/generate-yaml', methods=['POST'])
def generate_yaml():
    """Generate APIX YAML file"""
    data = request.json
    repo_url = data.get('repository_url', '')
    
    if not repo_url:
        return jsonify({'error': 'Repository URL is required'}), 400
    
    api_data = find_api_by_repo(repo_url)
    
    if not api_data:
        return jsonify({'error': 'No API data found for this repository'}), 404
    
    yaml_content = generate_apix_yaml(api_data)
    
    return jsonify({
        'yaml': yaml_content,
        'filename': 'apix.yaml'
    })

@app.route('/api/create-pr', methods=['POST'])
def create_pr():
    """Create a pull request with the APIX YAML file"""
    data = request.json
    repo_url = data.get('repository_url', '')
    yaml_content = data.get('yaml_content', '')
    github_token = data.get('github_token', '')
    
    if not all([repo_url, yaml_content, github_token]):
        return jsonify({'error': 'Missing required fields'}), 400
    
    try:
        # Parse repository owner and name from URL
        # Example: https://github.com/owner/repo or https://github.company.com/owner/repo
        parts = repo_url.rstrip('/').split('/')
        owner = parts[-2]
        repo = parts[-1].replace('.git', '')
        
        # Support both old (token) and new (Bearer) GitHub auth formats
        auth_header = f'Bearer {github_token}' if github_token.startswith('ghp_') or github_token.startswith('github_pat_') else f'token {github_token}'
        headers = {
            'Authorization': auth_header,
            'Accept': 'application/vnd.github.v3+json',
            'X-GitHub-Api-Version': '2022-11-28'
        }
        print(f"Using auth format: {auth_header.split()[0]}")
        
        # Get default branch
        repo_info_url = f'{GITHUB_API_BASE}/repos/{owner}/{repo}'
        print(f"Fetching repo info: {repo_info_url}")
        repo_response = requests.get(
            repo_info_url, 
            headers=headers, 
            proxies=PROXIES if PROXIES else None,
            verify=SSL_VERIFY
        )
        
        if repo_response.status_code != 200:
            error_msg = repo_response.json().get('message', 'Unknown error')
            print(f"Failed to access repo: {repo_response.status_code} - {error_msg}")
            return jsonify({'error': f'Failed to access repository: {error_msg}. Check your token and repository URL.'}), 400
        
        default_branch = repo_response.json()['default_branch']
        print(f"Default branch: {default_branch}")
        
        # Get the SHA of the default branch
        ref_url = f'{GITHUB_API_BASE}/repos/{owner}/{repo}/git/refs/heads/{default_branch}'
        ref_response = requests.get(ref_url, headers=headers, proxies=PROXIES if PROXIES else None, verify=SSL_VERIFY)
        
        if ref_response.status_code != 200:
            error_msg = ref_response.json().get('message', 'Unknown error')
            print(f"Failed to get branch ref: {ref_response.status_code} - {error_msg}")
            return jsonify({'error': f'Failed to get branch reference: {error_msg}'}), 400
            
        base_sha = ref_response.json()['object']['sha']
        print(f"Base SHA: {base_sha}")
        
        # Create a new branch
        branch_name = f'apix-metadata-{datetime.now().strftime("%Y%m%d-%H%M%S")}'
        create_branch_url = f'{GITHUB_API_BASE}/repos/{owner}/{repo}/git/refs'
        branch_data = {
            'ref': f'refs/heads/{branch_name}',
            'sha': base_sha
        }
        print(f"Creating branch: {branch_name}")
        branch_response = requests.post(create_branch_url, json=branch_data, headers=headers, proxies=PROXIES if PROXIES else None, verify=SSL_VERIFY)
        
        if branch_response.status_code not in [200, 201]:
            error_msg = branch_response.json().get('message', 'Unknown error')
            print(f"Failed to create branch: {branch_response.status_code} - {error_msg}")
            return jsonify({'error': f'Failed to create branch: {error_msg}'}), 400
        
        print(f"Branch created successfully: {branch_name}")
        
        # Create or update the file
        file_path = 'apix.yaml'
        file_url = f'{GITHUB_API_BASE}/repos/{owner}/{repo}/contents/{file_path}'
        
        # Check if file exists
        file_check = requests.get(f'{file_url}?ref={branch_name}', headers=headers, proxies=PROXIES if PROXIES else None, verify=SSL_VERIFY)
        
        file_data = {
            'message': 'Add APIX metadata file for API audit',
            'content': base64.b64encode(yaml_content.encode()).decode(),
            'branch': branch_name
        }
        
        if file_check.status_code == 200:
            file_data['sha'] = file_check.json()['sha']
            print(f"File exists, updating...")
        else:
            print(f"File doesn't exist, creating new...")
        
        file_response = requests.put(file_url, json=file_data, headers=headers, proxies=PROXIES if PROXIES else None, verify=SSL_VERIFY)
        
        if file_response.status_code not in [200, 201]:
            error_msg = file_response.json().get('message', 'Unknown error')
            print(f"Failed to create file: {file_response.status_code} - {error_msg}")
            return jsonify({'error': f'Failed to create file: {error_msg}'}), 400
        
        print(f"File created/updated successfully")
        
        # Create pull request
        pr_url = f'{GITHUB_API_BASE}/repos/{owner}/{repo}/pulls'
        pr_data = {
            'title': 'Add APIX metadata file',
            'body': 'This PR adds the APIX metadata file for API repository audit.\n\nGenerated automatically by APIX Automation Tool.',
            'head': branch_name,
            'base': default_branch
        }
        print(f"Creating pull request from {branch_name} to {default_branch}")
        pr_response = requests.post(pr_url, json=pr_data, headers=headers, proxies=PROXIES if PROXIES else None, verify=SSL_VERIFY)
        
        if pr_response.status_code == 201:
            pr_info = pr_response.json()
            print(f"PR created successfully: {pr_info['html_url']}")
            return jsonify({
                'success': True,
                'pr_url': pr_info['html_url'],
                'pr_number': pr_info['number']
            })
        else:
            error_msg = pr_response.json().get('message', 'Unknown error')
            errors = pr_response.json().get('errors', [])
            print(f"Failed to create PR: {pr_response.status_code} - {error_msg}")
            if errors:
                print(f"Errors: {errors}")
            return jsonify({'error': f'Failed to create pull request: {error_msg}', 'details': pr_response.json()}), 400
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/upload-excel', methods=['POST'])
def upload_excel():
    """
    Upload and parse transposed Excel file
    Returns all APIs grouped by repository URL
    """
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not file.filename.endswith(('.xlsx', '.xls')):
            return jsonify({'error': 'Only Excel files (.xlsx, .xls) are supported'}), 400
        
        # Save temporarily
        temp_path = os.path.join('/tmp', f'upload_{datetime.now().timestamp()}.xlsx')
        file.save(temp_path)
        
        print(f"Uploaded file saved to: {temp_path}")
        
        # Parse the transposed Excel
        grouped_apis = parse_transposed_excel(temp_path)
        
        # Clean up temp file
        os.remove(temp_path)
        
        if not grouped_apis:
            return jsonify({'error': 'No valid API data found in Excel file'}), 400
        
        # Convert to response format
        result = {
            'total_repos': len(grouped_apis),
            'total_apis': sum(len(apis) for apis in grouped_apis.values()),
            'repositories': {}
        }
        
        for repo_url, apis in grouped_apis.items():
            result['repositories'][repo_url] = {
                'count': len(apis),
                'apis': apis
            }
        
        return jsonify(result)
        
    except Exception as e:
        print(f"Error in upload_excel: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/generate-yaml-from-upload', methods=['POST'])
def generate_yaml_from_upload():
    """
    Generate YAML for a specific repository from uploaded data
    Request body: { repository_url: string, apis: [...] }
    """
    try:
        data = request.json
        repo_url = data.get('repository_url')
        apis = data.get('apis', [])
        
        if not repo_url or not apis:
            return jsonify({'error': 'repository_url and apis are required'}), 400
        
        # Generate YAML for these APIs
        yaml_content = generate_apix_yaml(apis)
        
        return jsonify({
            'yaml': yaml_content,
            'filename': 'apix.yaml',
            'repository_url': repo_url,
            'api_count': len(apis)
        })
        
    except Exception as e:
        print(f"Error generating YAML: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'healthy'})

if __name__ == '__main__':
    app.run(debug=True, port=5001, host='127.0.0.1')
