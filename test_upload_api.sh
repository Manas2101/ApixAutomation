#!/bin/bash
# Test script for transposed Excel upload API

echo "=== Testing Transposed Excel Upload API ==="
echo ""
echo "Usage: ./test_upload_api.sh /path/to/your/transposed.xlsx"
echo ""

if [ -z "$1" ]; then
    echo "Error: Please provide path to Excel file"
    echo "Example: ./test_upload_api.sh ~/Desktop/my_apis.xlsx"
    exit 1
fi

EXCEL_FILE="$1"

if [ ! -f "$EXCEL_FILE" ]; then
    echo "Error: File not found: $EXCEL_FILE"
    exit 1
fi

echo "Uploading: $EXCEL_FILE"
echo ""

# Upload and parse Excel
curl -X POST http://localhost:5001/api/upload-excel \
  -F "file=@$EXCEL_FILE" \
  -H "Accept: application/json" | python3 -m json.tool

echo ""
echo "=== Upload Complete ==="
