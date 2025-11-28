# Dev vs Production Publishing Comparison

## Overview

This document compares the two publishing workflows in the ApixAutomation system.

## Architecture Comparison

### Dev Publishing (Current System)

```
┌─────────────┐
│   Frontend  │
│  (React)    │
└──────┬──────┘
       │ HTTP POST
       ▼
┌─────────────────────────────────┐
│   Backend API (Flask)           │
│   /api/publish                  │
│   - Validates PR merged         │
│   - Loads from local CSV/Excel  │
│   - Publishes to dev.apix       │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│   Dev APIX Inventory            │
│   dev.apix.uk.hsbc              │
└─────────────────────────────────┘
```

### Production Publishing (New Script)

```
┌─────────────────────────────────┐
│   repos.txt                     │
│   - List of GitHub repo URLs    │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│   publish_to_prod.py            │
│   - Fetches metaapix from repos │
│   - Batch processes all repos   │
│   - Publishes to prod.apix      │
│   - Generates JSON report       │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│   Production APIX Inventory     │
│   apix.uk.hsbc                  │
└─────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│   JSON Report                   │
│   - Success/failure counts      │
│   - Detailed error messages     │
└─────────────────────────────────┘
```

## Feature Comparison

| Feature | Dev Publishing | Production Publishing |
|---------|---------------|----------------------|
| **Endpoint** | `https://dev.apix.uk.hsbc/api/v1/publish/apis` | `https://apix.uk.hsbc/api/v1/publish/apis` |
| **Interface** | Web UI (React Frontend) | Command Line Script |
| **Data Source** | CSV/Excel Upload → Local Storage | GitHub Repositories |
| **Batch Support** | No (one at a time) | Yes (multiple repos) |
| **PR Validation** | Yes (checks if merged) | No (assumes ready) |
| **Report** | UI notification only | JSON file with details |
| **Invocation Source** | `CI_ABC` | `CI_PROD` |
| **Automation** | Manual via UI | Scriptable/CI-CD ready |
| **Metaapix Location** | Generated from CSV | Fetched from repo |

## Workflow Comparison

### Dev Publishing Workflow

1. **Upload Data**
   - User uploads CSV/Excel via web UI
   - Data stored in `sample_api_data.csv`

2. **Create PR**
   - User clicks "Create PR" button
   - System creates PR with metaapix file
   - PR created in target repository

3. **Wait for Merge**
   - User manually merges PR in GitHub
   - System polls PR status

4. **Publish**
   - User clicks "Publish" button
   - System validates PR is merged
   - Publishes to dev inventory
   - Shows success/error in UI

### Production Publishing Workflow

1. **Prepare Repos List**
   ```bash
   cat > repos.txt << EOF
   https://github.com/org/repo1
   https://github.com/org/repo2
   EOF
   ```

2. **Run Script**
   ```bash
   python publish_to_prod.py --repos-file repos.txt
   ```

3. **Automatic Processing**
   - Script fetches metaapix from each repo
   - Publishes to production
   - Generates report

4. **Review Report**
   ```bash
   cat prod_publish_report_*.json
   ```

## Use Cases

### When to Use Dev Publishing

- ✅ Testing new APIs before production
- ✅ Manual review and approval needed
- ✅ Single API at a time
- ✅ Interactive UI preferred
- ✅ Need PR-based workflow

### When to Use Production Publishing

- ✅ Batch publishing multiple APIs
- ✅ APIs already have metaapix in repos
- ✅ Automated/scheduled deployments
- ✅ CI/CD pipeline integration
- ✅ Need detailed reports
- ✅ Command-line automation

## Data Flow

### Dev Publishing Data Flow

```
CSV/Excel Upload
    ↓
Parse & Validate
    ↓
Store in sample_api_data.csv
    ↓
Generate JSON (validate_and_generate_json)
    ↓
Create PR with metaapix
    ↓
Wait for PR Merge
    ↓
Publish to Dev Inventory
```

### Production Publishing Data Flow

```
Repository URLs
    ↓
Fetch metaapix.json from GitHub
    ↓
Parse & Validate JSON
    ↓
Publish to Prod Inventory
    ↓
Generate Success/Failure Report
```

## Configuration Differences

### Dev Publishing Configuration

```python
# In app.py
publish_url = 'https://dev.apix.uk.hsbc/api/v1/publish/apis'

headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Invocation-Source': 'CI_ABC',
    'Authorization': os.environ.get('APIX_VALIDATION_TOKEN')
}
```

### Production Publishing Configuration

```python
# In publish_to_prod.py
PROD_PUBLISH_URL = 'https://apix.uk.hsbc/api/v1/publish/apis'

headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Invocation-Source': 'CI_PROD',
    'Authorization': self.apix_token
}
```

## Error Handling

### Dev Publishing

- PR not merged → Shows error in UI
- API data not found → 404 error
- Publish fails → Shows error details in UI
- No batch retry mechanism

### Production Publishing

- Metaapix not found → Tries both main/master branches
- Publish fails → Continues with next repo
- Generates detailed error report
- Batch processing continues on failure
- Exit code indicates overall success/failure

## Report Formats

### Dev Publishing Report

```json
{
  "success": true,
  "message": "🎉 API metadata published successfully!",
  "repository_url": "https://github.com/org/repo",
  "published_apis": 1,
  "timestamp": "2024-11-28T10:00:00Z"
}
```

### Production Publishing Report

```json
{
  "timestamp": "2024-11-28T10:00:00Z",
  "total_repos": 10,
  "successful": 8,
  "failed": 2,
  "details": [
    {
      "repository_url": "https://github.com/org/repo1",
      "success": true,
      "api_count": 3,
      "status_code": 200,
      "timestamp": "2024-11-28T10:00:05Z"
    },
    {
      "repository_url": "https://github.com/org/repo2",
      "success": false,
      "error": "metaapix file not found",
      "timestamp": "2024-11-28T10:00:10Z"
    }
  ]
}
```

## Integration Examples

### Dev Publishing - Frontend Integration

```javascript
// React component
const publishAPI = async (repoUrl) => {
  const response = await fetch('http://localhost:5001/api/publish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repository_url: repoUrl })
  });
  const result = await response.json();
  return result;
};
```

### Production Publishing - CI/CD Integration

```yaml
# GitHub Actions
- name: Publish to Production
  run: |
    python publish_to_prod.py --repos-file repos.txt
    
- name: Check Success Rate
  run: |
    python -c "
    import json
    with open('prod_publish_report_*.json') as f:
      data = json.load(f)
      rate = data['successful'] / data['total_repos']
      if rate < 0.9:
        exit(1)
    "
```

## Migration Path

To migrate from dev to production publishing:

1. **Ensure metaapix files exist in repos**
   - Each repo should have `metaapix.json` in root
   - Can be created via dev publishing workflow first

2. **Collect repository URLs**
   - Create a list of all repos to publish
   - Save to `repos.txt`

3. **Test with small batch**
   ```bash
   python publish_to_prod.py repo1 repo2
   ```

4. **Review report and fix errors**

5. **Run full batch**
   ```bash
   python publish_to_prod.py --repos-file repos.txt
   ```

## Best Practices

### Dev Publishing

- Use for initial API onboarding
- Test APIs in dev environment first
- Review PRs before merging
- One API at a time for careful review

### Production Publishing

- Ensure metaapix files are tested
- Run small batches first
- Always review the JSON report
- Automate in CI/CD for regular updates
- Monitor success rate (should be > 90%)

## Summary

| Aspect | Dev | Production |
|--------|-----|-----------|
| **Purpose** | Testing & Development | Production Deployment |
| **Speed** | Slower (manual steps) | Fast (automated) |
| **Scale** | Single API | Batch (multiple) |
| **Safety** | PR review required | Assumes ready |
| **Reporting** | UI only | JSON file |
| **Automation** | Limited | Full |
