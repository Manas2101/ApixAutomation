from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import yaml
import os
import requests
from datetime import datetime
import base64

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
DATA_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'sample_api_data.xlsx')

def load_api_data():
    """Load API data from CSV or Excel file"""
    try:
        print(f"Loading data from: {DATA_FILE}")
        
        # Detect file type and load accordingly
        file_extension = os.path.splitext(DATA_FILE)[1].lower()
        
        if file_extension == '.csv':
            df = pd.read_csv(DATA_FILE)
            print(f"Loaded {len(df)} rows from CSV")
        elif file_extension in ['.xlsx', '.xls']:
            df = pd.read_excel(DATA_FILE, engine='openpyxl')
            print(f"Loaded {len(df)} rows from Excel")
        else:
            print(f"Unsupported file format: {file_extension}")
            return None
        
        print(f"Columns: {df.columns.tolist()}")
        return df
    except Exception as e:
        print(f"Error loading data: {e}")
        return None

def normalize_repo_url(url):
    """Normalize GitHub repository URL for comparison"""
    url = url.strip().lower()
    # Remove trailing slashes
    url = url.rstrip('/')
    # Remove .git suffix if present
    if url.endswith('.git'):
        url = url[:-4]
    return url

def find_api_by_repo(repo_url):
    """Find API data by repository URL - returns list of all APIs in the repo"""
    df = load_api_data()
    if df is None:
        return None
    
    normalized_input = normalize_repo_url(repo_url)
    print(f"Searching for normalized URL: {normalized_input}")
    
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
            apis.append({
                'repository_url': row['repository_url'],
                'api_technical_name': row['api_technical_name'],
                'version': row['version'],
                'snow_business_application_id': row['snow_business_application_id'],
                'platform': row['platform'],
                'lifecycle_status': row['lifecycle_status'],
                'classification': row['classification'],
                'description': row.get('description', ''),
                'owner_team': row.get('owner_team', ''),
                'contact_email': row.get('contact_email', '')
            })
        return apis
    
    return None

def generate_apix_yaml(api_data_list):
    """Generate APIX YAML content from API data (supports multiple APIs)"""
    # If single API (for backward compatibility), convert to list
    if isinstance(api_data_list, dict):
        api_data_list = [api_data_list]
    
    # Generate YAML for multiple APIs
    yaml_documents = []
    
    for api_data in api_data_list:
        apix_content = {
            'apiVersion': 'apix.io/v1',
            'kind': 'APIMetadata',
            'metadata': {
                'name': api_data['api_technical_name'],
                'version': api_data['version'],
                'createdAt': datetime.now().isoformat(),
                'updatedAt': datetime.now().isoformat()
            },
            'spec': {
                'technicalName': api_data['api_technical_name'],
                'version': api_data['version'],
                'snow': {
                    'businessApplicationId': api_data['snow_business_application_id']
                },
                'platform': api_data['platform'],
                'lifecycle': {
                    'status': api_data['lifecycle_status']
                },
                'classification': api_data['classification'],
                'description': api_data.get('description', ''),
                'ownership': {
                    'team': api_data.get('owner_team', ''),
                    'contact': api_data.get('contact_email', '')
                }
            }
        }
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

@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'healthy'})

if __name__ == '__main__':
    app.run(debug=True, port=5001, host='127.0.0.1')
