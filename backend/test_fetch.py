import os
from fetch_excel import fetch_excel_from_github

os.environ['GITHUB_API_BASE'] = 'https://alm-github.systems.uk.hsbc'
os.environ['SSL_VERIFY'] = 'false'

try:
    print("Testing fetch_excel_from_github...")
    print("=" * 60)
    
    # Correct parameters based on your GitHub repo structure
    # URL should be: https://alm-github.systems.uk.hsbc/GDT-CDMS/automation_utilities/raw/Apix_Backend/Api_MetaData.xlsx
    result = fetch_excel_from_github(
        repo_owner='GDT-CDMS',
        repo_name='automation_utilities',
        file_path='Api_MetaData.xlsx',  # File at root of repo
        branch='Apix_Backend',
        github_base_url='https://alm-github.systems.uk.hsbc'
    )
    
    if isinstance(result, dict):
        print(f"\n✓ Successfully fetched and parsed transposed Excel")
        print(f"  Found {len(result)} unique repositories")
        print(f"  Total APIs: {sum(len(apis) for apis in result.values())}")
        print(f"\n  Sample repositories:")
        for i, (repo_url, apis) in enumerate(list(result.items())[:3]):
            print(f"    {i+1}. {repo_url}: {len(apis)} API(s)")
    else:
        print(f"\n✓ Successfully fetched single-sheet Excel")
        print(f"  Shape: {result.shape}")
        print(f"  Columns: {result.columns.tolist()}")
    
    print("\n" + "=" * 60)
    print("✓ Integration test PASSED")
    
except Exception as e:
    print(f"\n✗ Integration test FAILED")
    print(f"  Error: {e}")
    import traceback
    traceback.print_exc()
