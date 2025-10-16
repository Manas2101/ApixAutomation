#!/usr/bin/env python3
"""Verify all dependencies are correctly installed"""

import sys
import os

def test_imports():
    """Test all required imports"""
    print("Testing imports...")
    all_ok = True
    
    try:
        import flask
        print(f"  ✓ Flask {flask.__version__}")
    except ImportError as e:
        print(f"  ✗ Flask: {e}")
        all_ok = False
    
    try:
        import flask_cors
        print(f"  ✓ flask-cors")
    except ImportError as e:
        print(f"  ✗ flask-cors: {e}")
        all_ok = False
    
    try:
        import pandas as pd
        print(f"  ✓ pandas {pd.__version__}")
    except ImportError as e:
        print(f"  ✗ pandas: {e}")
        all_ok = False
    
    try:
        import yaml
        print(f"  ✓ PyYAML")
    except ImportError as e:
        print(f"  ✗ PyYAML: {e}")
        all_ok = False
    
    try:
        import requests
        print(f"  ✓ requests {requests.__version__}")
    except ImportError as e:
        print(f"  ✗ requests: {e}")
        all_ok = False
    
    try:
        import openpyxl
        print(f"  ✓ openpyxl {openpyxl.__version__}")
    except ImportError as e:
        print(f"  ✗ openpyxl: {e}")
        all_ok = False
    
    return all_ok

def test_functionality():
    """Test basic functionality"""
    print("\nTesting functionality...")
    
    try:
        import pandas as pd
        
        # Test CSV reading
        csv_file = 'sample_api_data.csv'
        if os.path.exists(csv_file):
            df = pd.read_csv(csv_file)
            print(f"  ✓ CSV reading: {len(df)} rows, {len(df.columns)} columns")
        else:
            print(f"  ⚠ CSV file not found: {csv_file}")
        
        # Test Excel reading
        excel_file = 'sample_api_data.xlsx'
        if os.path.exists(excel_file):
            try:
                df_excel = pd.read_excel(excel_file)
                print(f"  ✓ Excel reading: {len(df_excel)} rows, {len(df_excel.columns)} columns")
            except Exception as e:
                print(f"  ⚠ Excel reading error: {e}")
        else:
            print(f"  ⚠ Excel file not found: {excel_file} (optional)")
        
        return True
    except Exception as e:
        print(f"  ✗ Functionality test failed: {e}")
        return False

def test_flask_app():
    """Test Flask app can be imported"""
    print("\nTesting Flask app...")
    
    try:
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))
        import app as flask_app
        print(f"  ✓ Flask app imported successfully")
        print(f"  ✓ Proxy config: {flask_app.PROXIES if flask_app.PROXIES else 'None'}")
        return True
    except Exception as e:
        print(f"  ✗ Flask app import failed: {e}")
        return False

def main():
    print("=" * 60)
    print("APIX Automation - Dependency Verification")
    print("=" * 60)
    print()
    
    imports_ok = test_imports()
    functionality_ok = test_functionality()
    app_ok = test_flask_app()
    
    print()
    print("=" * 60)
    if imports_ok and functionality_ok and app_ok:
        print("✓ All tests passed! Ready to run the application.")
        print()
        print("Next steps:")
        print("  1. Start backend: cd backend && python app.py")
        print("  2. Start frontend: python3 serve_frontend.py")
        print("  3. Open browser: http://localhost:3000")
        print("=" * 60)
        return 0
    else:
        print("✗ Some tests failed. Please check the errors above.")
        print()
        if not imports_ok:
            print("Fix: Install missing packages:")
            print("  cd backend && source venv/bin/activate")
            print("  pip install -r requirements.txt")
        print("=" * 60)
        return 1

if __name__ == "__main__":
    sys.exit(main())
