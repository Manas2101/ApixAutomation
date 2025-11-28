#!/usr/bin/env python3
"""
Production API Publishing Script
Fetches metaapix files from multiple repositories and publishes them to production.
Generates a JSON report with success/failure statistics.
"""

import os
import sys
import json
import requests
import base64
from datetime import datetime
from typing import List, Dict, Any
import argparse


# Configuration
PROD_PUBLISH_URL = 'https://apix.uk.hsbc/api/v1/publish/apis'  # Production URL
METAAPIX_FILENAME = 'metaapix.json'  # Default metaapix file name

# Proxy configuration
PROXIES = {
    'http': os.environ.get('HTTP_PROXY', os.environ.get('http_proxy')),
    'https': os.environ.get('HTTPS_PROXY', os.environ.get('https_proxy'))
}
PROXIES = {k: v for k, v in PROXIES.items() if v}

SSL_VERIFY = os.environ.get('SSL_VERIFY', 'true').lower() != 'false'


class ProductionPublisher:
    """Handles fetching metaapix files and publishing to production"""
    
    def __init__(self, github_token: str = None, apix_token: str = None):
        self.github_token = github_token or os.environ.get('GITHUB_TOKEN')
        self.apix_token = apix_token or os.environ.get('APIX_VALIDATION_TOKEN')
        
        if not self.github_token:
            raise ValueError("GitHub token is required. Set GITHUB_TOKEN environment variable or pass it as argument.")
        
        if not self.apix_token:
            raise ValueError("APIX token is required. Set APIX_VALIDATION_TOKEN environment variable or pass it as argument.")
        
        self.results = {
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'total_repos': 0,
            'successful': 0,
            'failed': 0,
            'details': []
        }
    
    def parse_github_url(self, repo_url: str) -> Dict[str, str]:
        """Parse GitHub repository URL to extract owner and repo name"""
        # Handle various GitHub URL formats
        repo_url = repo_url.strip().rstrip('/')
        
        # Remove .git suffix if present
        if repo_url.endswith('.git'):
            repo_url = repo_url[:-4]
        
        # Extract from HTTPS URL: https://github.com/owner/repo
        if 'github.com/' in repo_url:
            parts = repo_url.split('github.com/')[-1].split('/')
            if len(parts) >= 2:
                return {
                    'owner': parts[0],
                    'repo': parts[1]
                }
        
        # Extract from SSH URL: git@github.com:owner/repo
        if 'git@github.com:' in repo_url:
            parts = repo_url.split('git@github.com:')[-1].split('/')
            if len(parts) >= 2:
                return {
                    'owner': parts[0],
                    'repo': parts[1]
                }
        
        raise ValueError(f"Invalid GitHub URL format: {repo_url}")
    
    def fetch_metaapix_from_repo(self, repo_url: str, branch: str = 'main') -> Dict[str, Any]:
        """Fetch metaapix file from a GitHub repository"""
        try:
            repo_info = self.parse_github_url(repo_url)
            owner = repo_info['owner']
            repo = repo_info['repo']
            
            # GitHub API URL to fetch file content
            api_url = f"https://api.github.com/repos/{owner}/{repo}/contents/{METAAPIX_FILENAME}"
            
            headers = {
                'Authorization': f'token {self.github_token}',
                'Accept': 'application/vnd.github.v3+json'
            }
            
            params = {'ref': branch}
            
            print(f"  Fetching {METAAPIX_FILENAME} from {owner}/{repo}...")
            
            response = requests.get(
                api_url,
                headers=headers,
                params=params,
                proxies=PROXIES if PROXIES else None,
                verify=SSL_VERIFY,
                timeout=30
            )
            
            if response.status_code == 404:
                # Try 'master' branch if 'main' fails
                if branch == 'main':
                    print(f"  Branch 'main' not found, trying 'master'...")
                    return self.fetch_metaapix_from_repo(repo_url, branch='master')
                else:
                    raise Exception(f"metaapix file not found in repository (tried both 'main' and 'master' branches)")
            
            response.raise_for_status()
            
            # Decode base64 content
            content_base64 = response.json().get('content', '')
            content = base64.b64decode(content_base64).decode('utf-8')
            
            # Parse JSON content
            metaapix_data = json.loads(content)
            
            print(f"  ✓ Successfully fetched metaapix file")
            return metaapix_data
            
        except Exception as e:
            raise Exception(f"Failed to fetch metaapix from {repo_url}: {str(e)}")
    
    def publish_to_production(self, metaapix_data: Dict[str, Any], repo_url: str) -> Dict[str, Any]:
        """Publish API metadata to production"""
        headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Invocation-Source': 'CI_PROD',
            'Authorization': self.apix_token
        }
        
        print(f"  Publishing to production: {PROD_PUBLISH_URL}")
        
        response = requests.post(
            PROD_PUBLISH_URL,
            json=metaapix_data,
            headers=headers,
            proxies=PROXIES if PROXIES else None,
            verify=SSL_VERIFY,
            timeout=60
        )
        
        if response.status_code == 200:
            print(f"  ✓ Successfully published to production")
            return {
                'success': True,
                'status_code': response.status_code,
                'response': response.json() if response.text else {}
            }
        else:
            error_detail = response.json() if response.text else {'error': response.text}
            print(f"  ✗ Failed to publish (HTTP {response.status_code})")
            return {
                'success': False,
                'status_code': response.status_code,
                'error': error_detail
            }
    
    def process_repository(self, repo_url: str) -> Dict[str, Any]:
        """Process a single repository: fetch metaapix and publish"""
        result = {
            'repository_url': repo_url,
            'success': False,
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'error': None,
            'publish_response': None
        }
        
        try:
            print(f"\n{'='*80}")
            print(f"Processing: {repo_url}")
            print(f"{'='*80}")
            
            # Fetch metaapix file
            metaapix_data = self.fetch_metaapix_from_repo(repo_url)
            
            # Count APIs in metaapix
            api_count = 0
            if isinstance(metaapix_data, dict):
                if 'apis' in metaapix_data:
                    api_count = len(metaapix_data['apis']) if isinstance(metaapix_data['apis'], list) else 1
                elif 'api' in metaapix_data:
                    api_count = 1
            
            result['api_count'] = api_count
            print(f"  Found {api_count} API(s) in metaapix file")
            
            # Publish to production
            publish_result = self.publish_to_production(metaapix_data, repo_url)
            
            result['success'] = publish_result['success']
            result['publish_response'] = publish_result.get('response')
            result['status_code'] = publish_result.get('status_code')
            
            if not publish_result['success']:
                result['error'] = publish_result.get('error')
            
        except Exception as e:
            result['error'] = str(e)
            print(f"  ✗ Error: {str(e)}")
        
        return result
    
    def process_repositories(self, repo_urls: List[str]) -> Dict[str, Any]:
        """Process multiple repositories and generate report"""
        self.results['total_repos'] = len(repo_urls)
        
        print(f"\n{'#'*80}")
        print(f"# Production API Publishing")
        print(f"# Total Repositories: {len(repo_urls)}")
        print(f"# Target: {PROD_PUBLISH_URL}")
        print(f"{'#'*80}\n")
        
        for repo_url in repo_urls:
            result = self.process_repository(repo_url)
            self.results['details'].append(result)
            
            if result['success']:
                self.results['successful'] += 1
            else:
                self.results['failed'] += 1
        
        # Print summary
        print(f"\n{'='*80}")
        print(f"SUMMARY")
        print(f"{'='*80}")
        print(f"Total Repositories: {self.results['total_repos']}")
        print(f"Successful: {self.results['successful']}")
        print(f"Failed: {self.results['failed']}")
        print(f"Success Rate: {(self.results['successful']/self.results['total_repos']*100):.1f}%")
        print(f"{'='*80}\n")
        
        return self.results
    
    def save_report(self, output_file: str = None):
        """Save the report to a JSON file"""
        if not output_file:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            output_file = f'prod_publish_report_{timestamp}.json'
        
        with open(output_file, 'w') as f:
            json.dump(self.results, f, indent=2)
        
        print(f"Report saved to: {output_file}")
        return output_file


def main():
    parser = argparse.ArgumentParser(
        description='Publish APIs to production from multiple repositories',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # From command line arguments
  python publish_to_prod.py https://github.com/org/repo1 https://github.com/org/repo2
  
  # From a file (one URL per line)
  python publish_to_prod.py --repos-file repos.txt
  
  # With custom output file
  python publish_to_prod.py --repos-file repos.txt --output report.json
  
Environment Variables:
  GITHUB_TOKEN           - GitHub personal access token (required)
  APIX_VALIDATION_TOKEN  - APIX API token (required)
  HTTP_PROXY            - HTTP proxy URL (optional)
  HTTPS_PROXY           - HTTPS proxy URL (optional)
  SSL_VERIFY            - Set to 'false' to disable SSL verification (optional)
        """
    )
    
    parser.add_argument(
        'repos',
        nargs='*',
        help='Repository URLs to process'
    )
    
    parser.add_argument(
        '--repos-file',
        help='File containing repository URLs (one per line)'
    )
    
    parser.add_argument(
        '--output',
        help='Output file for the JSON report (default: prod_publish_report_<timestamp>.json)'
    )
    
    parser.add_argument(
        '--github-token',
        help='GitHub personal access token (overrides GITHUB_TOKEN env var)'
    )
    
    parser.add_argument(
        '--apix-token',
        help='APIX API token (overrides APIX_VALIDATION_TOKEN env var)'
    )
    
    args = parser.parse_args()
    
    # Collect repository URLs
    repo_urls = []
    
    if args.repos:
        repo_urls.extend(args.repos)
    
    if args.repos_file:
        if not os.path.exists(args.repos_file):
            print(f"Error: File not found: {args.repos_file}")
            sys.exit(1)
        
        with open(args.repos_file, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#'):
                    repo_urls.append(line)
    
    if not repo_urls:
        parser.print_help()
        print("\nError: No repository URLs provided. Use positional arguments or --repos-file")
        sys.exit(1)
    
    try:
        # Initialize publisher
        publisher = ProductionPublisher(
            github_token=args.github_token,
            apix_token=args.apix_token
        )
        
        # Process repositories
        results = publisher.process_repositories(repo_urls)
        
        # Save report
        report_file = publisher.save_report(args.output)
        
        # Exit with error code if any failed
        if results['failed'] > 0:
            sys.exit(1)
        
    except ValueError as e:
        print(f"Configuration Error: {e}")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\n\nOperation cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"Unexpected Error: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()
