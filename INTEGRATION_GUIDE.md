# Fetch Excel Integration Guide

## Overview

The `fetch_excel.py` module has been integrated with `app.py` to fetch Excel files directly from GitHub Enterprise, supporting the transposed format where rows are field names and columns are records.

## Configuration

Set these environment variables to enable GitHub fetching:

```bash
# Enable GitHub fetching
export FETCH_FROM_GITHUB=true

# GitHub Enterprise configuration
export GITHUB_API_BASE=https://alm-github.systems.uk.hsbc
export GITHUB_REPO_OWNER=GDT-CDMS
export GITHUB_REPO_NAME=automation
export GITHUB_FILE_PATH=utilites/Api_MetaData.xlsx
export GITHUB_BRANCH=Apix_Backend

# Optional: GitHub token for private repos
export GITHUB_TOKEN=your_token_here

# Optional: SSL configuration
export SSL_VERIFY=false
export HTTP_PROXY=your_proxy
export HTTPS_PROXY=your_proxy
```

## Files

### `/backend/fetch_excel.py`
Simplified module that:
- Fetches Excel files from GitHub (public or Enterprise)
- Handles transposed format (multi-sheet with rows as fields)
- Uses environment variables for proxy and SSL configuration
- Returns parsed data in the same format as `parse_transposed_excel()`

### `/backend/app.py`
Updated to:
- Import `fetch_excel_from_github` from the new module
- Add configuration variables for GitHub fetching
- Use existing `load_api_data()` function which now supports both local files and GitHub fetching

## Usage

### Fetch from GitHub
```python
from fetch_excel import fetch_excel_from_github

data = fetch_excel_from_github(
    repo_owner='GDT-CDMS',
    repo_name='automation',
    file_path='utilites/Api_MetaData.xlsx',
    branch='Apix_Backend',
    github_base_url='https://alm-github.systems.uk.hsbc'
)
```

### Test the Integration
```bash
cd backend
python test_fetch.py
```

## Transposed Excel Format

The Excel file format:
- **Multiple sheets**: Each sheet represents an EIM ID
- **Column A**: Field names (vertical)
- **Columns B, C, D...**: Different API records (horizontal)

Example:
```
| Field Name                    | API 1      | API 2      |
|-------------------------------|------------|------------|
| API Repo                      | repo-url-1 | repo-url-2 |
| API Object/API Technical Name | api-name-1 | api-name-2 |
| version                       | v1.0.0     | v2.0.0     |
| ...                           | ...        | ...        |
```

## Cleaned Up Files

Removed unnecessary files:
- `/test/README.md`
- `/test/example_usage.py`
- `/test/requirements.txt`
- `/test/fetch_excel.py`
- Multiple documentation .md files from root
- Test shell scripts

## Key Features

1. **Simple Integration**: Single import, minimal configuration
2. **Enterprise GitHub Support**: Works with internal GitHub instances
3. **Proxy Support**: Respects HTTP_PROXY and HTTPS_PROXY environment variables
4. **SSL Flexibility**: Can disable SSL verification for internal certificates
5. **Transposed Format**: Automatically detects and parses multi-sheet transposed Excel
6. **Backward Compatible**: Still supports local file loading via DATA_FILE

## Environment Variables Summary

| Variable | Default | Description |
|----------|---------|-------------|
| `FETCH_FROM_GITHUB` | `false` | Enable GitHub fetching |
| `GITHUB_API_BASE` | `https://alm-github.systems.uk.hsbc` | GitHub base URL |
| `GITHUB_REPO_OWNER` | `GDT-CDMS` | Repository owner |
| `GITHUB_REPO_NAME` | `automation` | Repository name |
| `GITHUB_FILE_PATH` | `utilites/Api_MetaData.xlsx` | Path to Excel file |
| `GITHUB_BRANCH` | `Apix_Backend` | Branch name |
| `GITHUB_TOKEN` | None | GitHub token (optional) |
| `SSL_VERIFY` | `true` | Enable SSL verification |
| `HTTP_PROXY` | None | HTTP proxy URL |
| `HTTPS_PROXY` | None | HTTPS proxy URL |
