# Production Publishing Script - Summary

## ✅ What Was Created

I've created a complete production publishing solution with the following files:

### 1. Main Script
- **`publish_to_prod.py`** - The main production publishing script
  - Fetches `metaapix.json` from multiple GitHub repositories
  - Publishes to production APIX inventory (`https://apix.uk.hsbc/api/v1/publish/apis`)
  - Generates detailed JSON reports with success/failure statistics

### 2. Documentation
- **`QUICK_START_PROD.md`** - Quick start guide for immediate use
- **`PROD_PUBLISH_README.md`** - Comprehensive documentation
- **`DEV_VS_PROD_COMPARISON.md`** - Comparison between dev and prod workflows
- **`PRODUCTION_SCRIPT_SUMMARY.md`** - This file

### 3. Support Files
- **`requirements_prod.txt`** - Python dependencies
- **`repos_example.txt`** - Example repository URLs file
- **`test_prod_script.sh`** - Test helper script

## 🎯 Key Features

### ✅ Batch Processing
- Process multiple repositories in a single run
- Continues on failure (doesn't stop at first error)
- Parallel-ready design

### ✅ Automatic Metaapix Fetching
- Fetches `metaapix.json` directly from GitHub repos
- Tries both `main` and `master` branches automatically
- Supports multiple GitHub URL formats (HTTPS, SSH, .git)

### ✅ Production Publishing
- Publishes to production endpoint: `https://apix.uk.hsbc/api/v1/publish/apis`
- Uses `CI_PROD` invocation source
- Includes proper authentication and proxy support

### ✅ Detailed Reporting
- JSON report with success/failure counts
- Individual repository results
- Error messages for failed publications
- Timestamp tracking

## 📋 How It Works

```
Input: Repository URLs
    ↓
Fetch metaapix.json from each repo (GitHub API)
    ↓
Publish to Production APIX
    ↓
Generate JSON Report
    ↓
Output: Success/Failure Statistics
```

## 🚀 Quick Usage

### Setup (One-Time)
```bash
# Install dependencies
pip install -r requirements_prod.txt

# Set environment variables
export GITHUB_TOKEN="your_github_token"
export APIX_VALIDATION_TOKEN="your_apix_token"
```

### Run Script
```bash
# Option 1: Direct command line
python publish_to_prod.py https://github.com/org/repo1 https://github.com/org/repo2

# Option 2: From file (recommended)
python publish_to_prod.py --repos-file repos.txt
```

### Check Report
```bash
cat prod_publish_report_*.json
```

## 📊 Sample Report

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
      "api_count": 3,
      "status_code": 200,
      "timestamp": "2024-11-28T10:19:05.000000Z"
    },
    {
      "repository_url": "https://github.com/org/repo2",
      "success": false,
      "error": "metaapix file not found in repository"
    }
  ]
}
```

## 🔑 Key Differences from Dev Publishing

| Feature | Dev Publishing | Production Script |
|---------|---------------|-------------------|
| **Target** | `dev.apix.uk.hsbc` | `apix.uk.hsbc` |
| **Source** | CSV/Excel upload | GitHub repos |
| **Batch** | No | Yes |
| **Report** | UI only | JSON file |
| **Automation** | Manual | Scriptable |

## 📝 Example Workflow

```bash
# 1. Create repos list
cat > my_apis.txt << EOF
https://github.com/myorg/payment-api
https://github.com/myorg/user-api
https://github.com/myorg/order-api
EOF

# 2. Run script
python publish_to_prod.py --repos-file my_apis.txt

# 3. View results
cat prod_publish_report_*.json | python -m json.tool

# Output:
# ================================================================================
# SUMMARY
# ================================================================================
# Total Repositories: 3
# Successful: 3
# Failed: 0
# Success Rate: 100.0%
# ================================================================================
```

## 🛠️ Configuration

### Environment Variables

**Required:**
- `GITHUB_TOKEN` - GitHub personal access token
- `APIX_VALIDATION_TOKEN` - APIX API token

**Optional:**
- `HTTP_PROXY` - HTTP proxy URL
- `HTTPS_PROXY` - HTTPS proxy URL
- `SSL_VERIFY` - Set to 'false' to disable SSL verification

### Script Configuration

Edit `publish_to_prod.py` to change:
- `PROD_PUBLISH_URL` - Production endpoint URL
- `METAAPIX_FILENAME` - Metaapix file name (default: `metaapix.json`)

## 🔍 Error Handling

The script handles:
- ✅ Missing metaapix files (tries both main/master branches)
- ✅ Invalid GitHub URLs
- ✅ Network/timeout errors
- ✅ API errors (captures HTTP status codes)
- ✅ Missing environment variables
- ✅ JSON parsing errors

## 🎓 Next Steps

1. **Install dependencies:**
   ```bash
   pip install -r requirements_prod.txt
   ```

2. **Set up tokens:**
   ```bash
   export GITHUB_TOKEN="your_token"
   export APIX_VALIDATION_TOKEN="your_token"
   ```

3. **Test with one repo:**
   ```bash
   python publish_to_prod.py https://github.com/your-org/test-repo
   ```

4. **Run batch:**
   ```bash
   python publish_to_prod.py --repos-file repos.txt
   ```

5. **Review report:**
   ```bash
   cat prod_publish_report_*.json
   ```

## 📚 Documentation Files

- **Quick Start:** `QUICK_START_PROD.md`
- **Full Documentation:** `PROD_PUBLISH_README.md`
- **Dev vs Prod Comparison:** `DEV_VS_PROD_COMPARISON.md`
- **Example Repos File:** `repos_example.txt`

## 💡 Tips

1. **Test small batches first** - Start with 1-2 repos to verify configuration
2. **Review reports** - Always check the JSON report for errors
3. **Keep tokens secure** - Never commit tokens to version control
4. **Use repos file** - For batches > 3 repositories
5. **Monitor success rate** - Investigate if < 90%

## 🔗 Integration

### CI/CD Example (GitHub Actions)

```yaml
- name: Publish to Production
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    APIX_VALIDATION_TOKEN: ${{ secrets.APIX_TOKEN }}
  run: |
    python publish_to_prod.py --repos-file repos.txt
```

### Cron Job Example

```bash
# Daily at 2 AM
0 2 * * * cd /path/to/ApixAutomation && python publish_to_prod.py --repos-file daily_repos.txt
```

## ✨ Summary

You now have a complete production publishing solution that:
- ✅ Fetches metaapix files from GitHub repositories
- ✅ Publishes to production APIX inventory
- ✅ Processes multiple repositories in batch
- ✅ Generates detailed JSON reports
- ✅ Handles errors gracefully
- ✅ Is ready for CI/CD integration

The script is production-ready and can be used immediately after setting up the required environment variables.
