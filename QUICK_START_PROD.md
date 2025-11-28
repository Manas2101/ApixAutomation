# Quick Start Guide - Production Publishing

## What This Script Does

This script automates publishing APIs to **PRODUCTION** by:
1. ✅ Taking multiple repository URLs as input
2. ✅ Fetching `metaapix.json` file from each repository
3. ✅ Publishing to production APIX inventory (`https://apix.uk.hsbc/api/v1/publish/apis`)
4. ✅ Generating a JSON report with success/failure counts

## Setup (One-Time)

### 1. Install Dependencies

```bash
pip install -r requirements_prod.txt
```

Or manually:

```bash
pip install requests
```

### 2. Set Environment Variables

```bash
# Required
export GITHUB_TOKEN="ghp_your_github_token_here"
export APIX_VALIDATION_TOKEN="your_apix_token_here"

# Optional (if behind proxy)
export HTTP_PROXY="http://proxy.company.com:8080"
export HTTPS_PROXY="https://proxy.company.com:8080"
```

## Usage

### Option 1: Direct Command Line

```bash
python publish_to_prod.py \
  https://github.com/org/repo1 \
  https://github.com/org/repo2 \
  https://github.com/org/repo3
```

### Option 2: From a File (Recommended for Multiple Repos)

1. Create a file with repository URLs:

```bash
cat > my_repos.txt << EOF
https://github.com/org/api-service-1
https://github.com/org/api-service-2
https://github.com/org/api-service-3
https://github.com/org/api-service-4
EOF
```

2. Run the script:

```bash
python publish_to_prod.py --repos-file my_repos.txt
```

### Option 3: Custom Output File

```bash
python publish_to_prod.py --repos-file my_repos.txt --output my_custom_report.json
```

## What You'll See

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
SUMMARY
================================================================================
Total Repositories: 3
Successful: 2
Failed: 1
Success Rate: 66.7%
================================================================================

Report saved to: prod_publish_report_20241128_101900.json
```

## Understanding the Report

The JSON report contains:

```json
{
  "timestamp": "2024-11-28T10:19:00Z",
  "total_repos": 3,
  "successful": 2,
  "failed": 1,
  "details": [
    {
      "repository_url": "https://github.com/org/repo1",
      "success": true,
      "api_count": 2,
      "status_code": 200,
      "timestamp": "2024-11-28T10:19:05Z"
    },
    {
      "repository_url": "https://github.com/org/repo2",
      "success": false,
      "error": "metaapix file not found in repository"
    }
  ]
}
```

## Key Differences from Dev Publishing

| Aspect | Dev Script | Production Script |
|--------|-----------|-------------------|
| **URL** | `https://dev.apix.uk.hsbc/...` | `https://apix.uk.hsbc/...` |
| **Source** | Manual upload/local files | GitHub repositories |
| **Batch** | Single API at a time | Multiple repos at once |
| **Report** | No | Yes (JSON) |
| **Invocation** | `CI_ABC` | `CI_PROD` |

## Troubleshooting

### Error: "GitHub token is required"

```bash
export GITHUB_TOKEN="ghp_xxxxxxxxxxxxx"
```

### Error: "APIX token is required"

```bash
export APIX_VALIDATION_TOKEN="your_token_here"
```

### Error: "metaapix file not found"

- Ensure `metaapix.json` exists in the root of your repository
- The script tries both `main` and `master` branches automatically

### SSL/Proxy Issues

```bash
export SSL_VERIFY="false"  # Only if needed
export HTTP_PROXY="http://proxy:8080"
export HTTPS_PROXY="https://proxy:8080"
```

## Example Workflow

```bash
# 1. Prepare your repos list
cat > production_batch.txt << EOF
https://github.com/myorg/payment-api
https://github.com/myorg/user-api
https://github.com/myorg/notification-api
EOF

# 2. Set tokens (if not already set)
export GITHUB_TOKEN="ghp_xxxxx"
export APIX_VALIDATION_TOKEN="xxxxx"

# 3. Run the script
python publish_to_prod.py --repos-file production_batch.txt

# 4. Check the report
cat prod_publish_report_*.json | python -m json.tool

# 5. Review failures (if any)
cat prod_publish_report_*.json | python -c "
import json, sys
data = json.load(sys.stdin)
failed = [d for d in data['details'] if not d['success']]
if failed:
    print('Failed repositories:')
    for f in failed:
        print(f'  - {f[\"repository_url\"]}: {f[\"error\"]}')
"
```

## Best Practices

1. ✅ **Test with 1-2 repos first** before running large batches
2. ✅ **Review the JSON report** after each run
3. ✅ **Keep tokens secure** - never commit them to git
4. ✅ **Use repos file** for batches > 3 repositories
5. ✅ **Check success rate** - investigate if < 90%

## Files Created

- `publish_to_prod.py` - Main script
- `repos_example.txt` - Example repos file
- `requirements_prod.txt` - Python dependencies
- `PROD_PUBLISH_README.md` - Detailed documentation
- `QUICK_START_PROD.md` - This file
- `test_prod_script.sh` - Test helper script

## Need Help?

Run the help command:

```bash
python publish_to_prod.py --help
```

Or check the detailed README:

```bash
cat PROD_PUBLISH_README.md
```
