# Production Publishing by EIM ID (Excel Sheet)

Simple script to publish APIs to production by EIM ID. Each EIM ID is a **sheet name** in the Excel file.

## Setup

```bash
# Set environment variables
export GITHUB_TOKEN="your_github_token"
export APIX_VALIDATION_TOKEN="your_apix_token"
```

## Usage

### Interactive Mode
```bash
python publish_to_prod.py
# Script shows available sheets, then you enter the sheet name (EIM ID)
```

### Command Line Mode
```bash
python publish_to_prod.py EIM001
```

## What It Does

1. **Shows Available Sheets** - Lists all sheet names (EIM IDs) in the Excel file
2. **Prompts for EIM ID** - You enter the sheet name (e.g., EIM001, EIM002)
3. **Reads Excel Sheet** - Reads that specific sheet from `sample_api_data.xlsx`
4. **Fetches metaapix.json** - Gets metaapix.json from each repository in that sheet
5. **Publishes to Production** - Publishes to `https://apix.uk.hsbc/api/v1/publish/apis`
6. **Shows Results** - Displays success/failure in terminal (no files created)

## Headers Used

Same as dev publishing, except:
- **Invocation-Source**: `UI_{eim_id}` (e.g., `UI_BA0001754`)

## Example Output

```
================================================================================
Production API Publishing by EIM ID (Excel Sheet)
================================================================================

📁 Excel File: sample_api_data.xlsx
📋 Available EIM IDs (sheets): EIM001, EIM002, EIM003

Enter EIM ID (sheet name): EIM001

🎯 EIM ID (Sheet): EIM001
🌐 Target: https://apix.uk.hsbc/api/v1/publish/apis
📤 Invocation-Source: UI_EIM001

✅ Found 2 unique repository URL(s) in sheet: EIM001
   Total APIs: 3

--------------------------------------------------------------------------------
Starting Publication Process
--------------------------------------------------------------------------------

[1/2] https://github.com/org/api-repo-1
    Fetching metaapix.json from org/api-repo-1... ✅ FETCHED
    Publishing to production... ✅ SUCCESS

[2/2] https://github.com/org/api-repo-2
    Fetching metaapix.json from org/api-repo-2... ✅ FETCHED
    Publishing to production... ✅ SUCCESS

================================================================================
SUMMARY
================================================================================
EIM ID (Sheet): EIM001
Total Repositories: 2
✅ Successful: 2
❌ Failed: 0

🎉 All APIs published successfully!
================================================================================
```

## How It Works

- **EIM ID = Excel Sheet Name** - Each sheet in the Excel file represents one EIM ID
- **Transposed Format** - The script reads sheets in transposed format (like dev app)
- **Unique Repos** - Automatically extracts unique repository URLs from each sheet
- **Invocation-Source** - Uses `UI_{eim_id}` (e.g., `UI_EIM001`)

## Configuration

Edit the script to change:
- `PROD_PUBLISH_URL` - Production endpoint (default: `https://apix.uk.hsbc/api/v1/publish/apis`)
- `EXCEL_FILE` - Data file (default: `sample_api_data.xlsx`)
- `METAAPIX_FILENAME` - Metaapix file name (default: `metaapix.json`)

## Requirements

```bash
pip install pandas requests openpyxl
```

Or use existing backend requirements:
```bash
pip install -r backend/requirements.txt
```
