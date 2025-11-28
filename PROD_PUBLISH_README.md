# Production API Publishing Script

This script automates the process of publishing APIs to production by:
1. Fetching `metaapix.json` files from multiple GitHub repositories
2. Publishing them to the production APIX inventory
3. Generating a detailed JSON report with success/failure statistics

## Prerequisites

### Required Environment Variables

```bash
export GITHUB_TOKEN="your_github_personal_access_token"
export APIX_VALIDATION_TOKEN="your_apix_api_token"
```

### Optional Environment Variables

```bash
export HTTP_PROXY="http://proxy.example.com:8080"
export HTTPS_PROXY="https://proxy.example.com:8080"
export SSL_VERIFY="false"  # Only if you need to disable SSL verification
```

## Installation

The script uses only standard Python libraries and `requests`:

```bash
pip install requests
```

## Usage

### Method 1: Command Line Arguments

Provide repository URLs directly as arguments:

```bash
python publish_to_prod.py \
  https://github.com/org/repo1 \
  https://github.com/org/repo2 \
  https://github.com/org/repo3
```

### Method 2: From a File

Create a text file with repository URLs (one per line):

```bash
# repos.txt
https://github.com/org/repo1
https://github.com/org/repo2
https://github.com/org/repo3
```

Then run:

```bash
python publish_to_prod.py --repos-file repos.txt
```

### Method 3: Custom Output File

Specify a custom output file for the report:

```bash
python publish_to_prod.py --repos-file repos.txt --output my_report.json
```

### Method 4: Override Tokens

Override environment variables with command-line arguments:

```bash
python publish_to_prod.py \
  --github-token "ghp_xxxxx" \
  --apix-token "Bearer xxxxx" \
  --repos-file repos.txt
```

## Repository URL Formats

The script supports multiple GitHub URL formats:

- HTTPS: `https://github.com/owner/repo`
- HTTPS with .git: `https://github.com/owner/repo.git`
- SSH: `git@github.com:owner/repo.git`

## Output Report

The script generates a JSON report with the following structure:

```json
{
  "timestamp": "2024-11-28T10:19:00.000000Z",
  "total_repos": 5,
  "successful": 4,
  "failed": 1,
  "details": [
    {
      "repository_url": "https://github.com/org/repo1",
      "success": true,
      "timestamp": "2024-11-28T10:19:05.000000Z",
      "api_count": 3,
      "status_code": 200,
      "publish_response": {...},
      "error": null
    },
    {
      "repository_url": "https://github.com/org/repo2",
      "success": false,
      "timestamp": "2024-11-28T10:19:10.000000Z",
      "error": "Failed to fetch metaapix from repo: 404 Not Found",
      "publish_response": null
    }
  ]
}
```

## Report Fields

- **timestamp**: When the batch process started
- **total_repos**: Total number of repositories processed
- **successful**: Number of successfully published APIs
- **failed**: Number of failed publications
- **details**: Array of individual repository results
  - **repository_url**: The repository URL
  - **success**: Boolean indicating success/failure
  - **timestamp**: When this repository was processed
  - **api_count**: Number of APIs found in the metaapix file
  - **status_code**: HTTP status code from the publish API
  - **publish_response**: Response from the APIX API (if successful)
  - **error**: Error message (if failed)

## Example Output

```
################################################################################
# Production API Publishing
# Total Repositories: 3
# Target: https://apix.uk.hsbc/api/v1/publish/apis
################################################################################

================================================================================
Processing: https://github.com/org/repo1
================================================================================
  Fetching metaapix.json from org/repo1...
  ✓ Successfully fetched metaapix file
  Found 2 API(s) in metaapix file
  Publishing to production: https://apix.uk.hsbc/api/v1/publish/apis
  ✓ Successfully published to production

================================================================================
Processing: https://github.com/org/repo2
================================================================================
  Fetching metaapix.json from org/repo2...
  ✗ Error: Failed to fetch metaapix from repo: 404 Not Found

================================================================================
SUMMARY
================================================================================
Total Repositories: 3
Successful: 2
Failed: 1
Success Rate: 66.7%
================================================================================

Report saved to: prod_publish_report_20241128_101900.json
```

## Error Handling

The script handles various error scenarios:

1. **Missing metaapix file**: Tries both 'main' and 'master' branches
2. **Invalid GitHub URL**: Validates and parses repository URLs
3. **Network errors**: Includes timeout and proxy support
4. **API errors**: Captures and reports HTTP error codes
5. **Missing tokens**: Validates required environment variables

## Exit Codes

- **0**: All repositories published successfully
- **1**: One or more repositories failed to publish

## Configuration

### Production URL

The production publish URL is configured in the script:

```python
PROD_PUBLISH_URL = 'https://apix.uk.hsbc/api/v1/publish/apis'
```

To change it, edit the `PROD_PUBLISH_URL` variable in `publish_to_prod.py`.

### Metaapix Filename

The default metaapix filename is `metaapix.json`. To change it:

```python
METAAPIX_FILENAME = 'metaapix.json'
```

## Comparison with Dev Publishing

| Feature | Dev Publishing | Production Publishing |
|---------|---------------|----------------------|
| URL | `https://dev.apix.uk.hsbc/api/v1/publish/apis` | `https://apix.uk.hsbc/api/v1/publish/apis` |
| Invocation Source | `CI_ABC` | `CI_PROD` |
| Batch Processing | No | Yes |
| JSON Report | No | Yes |
| Metaapix Source | Local/Upload | GitHub Repos |

## Troubleshooting

### "GitHub token is required"

Set the `GITHUB_TOKEN` environment variable:

```bash
export GITHUB_TOKEN="ghp_your_token_here"
```

### "APIX token is required"

Set the `APIX_VALIDATION_TOKEN` environment variable:

```bash
export APIX_VALIDATION_TOKEN="your_apix_token_here"
```

### "metaapix file not found"

Ensure the repository contains a `metaapix.json` file in the root directory.

### SSL Certificate Errors

If you encounter SSL errors, you can disable verification (not recommended for production):

```bash
export SSL_VERIFY="false"
```

### Proxy Issues

Configure proxy settings:

```bash
export HTTP_PROXY="http://proxy.company.com:8080"
export HTTPS_PROXY="https://proxy.company.com:8080"
```

## Best Practices

1. **Test with a small batch first**: Start with 1-2 repositories to verify configuration
2. **Review the report**: Always check the JSON report for errors
3. **Keep tokens secure**: Never commit tokens to version control
4. **Use a repos file**: For large batches, use a file instead of command-line arguments
5. **Monitor success rate**: Investigate if success rate is below 90%

## Integration with CI/CD

You can integrate this script into your CI/CD pipeline:

```yaml
# Example GitHub Actions workflow
name: Publish to Production

on:
  workflow_dispatch:
    inputs:
      repos_file:
        description: 'File containing repository URLs'
        required: true
        default: 'repos.txt'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Set up Python
        uses: actions/setup-python@v2
        with:
          python-version: '3.9'
      
      - name: Install dependencies
        run: pip install requests
      
      - name: Publish to Production
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          APIX_VALIDATION_TOKEN: ${{ secrets.APIX_TOKEN }}
        run: |
          python publish_to_prod.py --repos-file ${{ github.event.inputs.repos_file }}
      
      - name: Upload Report
        uses: actions/upload-artifact@v2
        with:
          name: publish-report
          path: prod_publish_report_*.json
```

## Support

For issues or questions, please contact the API Platform team.
