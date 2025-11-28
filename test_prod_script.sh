#!/bin/bash
# Test script for production publishing
# This is a dry-run test to verify the script works

echo "Testing Production Publishing Script"
echo "====================================="
echo ""

# Check if environment variables are set
if [ -z "$GITHUB_TOKEN" ]; then
    echo "⚠️  GITHUB_TOKEN not set"
    echo "   Set it with: export GITHUB_TOKEN='your_token'"
else
    echo "✓ GITHUB_TOKEN is set"
fi

if [ -z "$APIX_VALIDATION_TOKEN" ]; then
    echo "⚠️  APIX_VALIDATION_TOKEN not set"
    echo "   Set it with: export APIX_VALIDATION_TOKEN='your_token'"
else
    echo "✓ APIX_VALIDATION_TOKEN is set"
fi

echo ""
echo "Script Help:"
echo "============"
python publish_to_prod.py --help

echo ""
echo ""
echo "To run the script with actual repositories:"
echo "==========================================="
echo ""
echo "1. Create a repos.txt file with your repository URLs:"
echo "   cat > repos.txt << EOF"
echo "   https://github.com/your-org/repo1"
echo "   https://github.com/your-org/repo2"
echo "   EOF"
echo ""
echo "2. Run the script:"
echo "   python publish_to_prod.py --repos-file repos.txt"
echo ""
echo "3. Check the generated report:"
echo "   cat prod_publish_report_*.json | jq ."
echo ""
