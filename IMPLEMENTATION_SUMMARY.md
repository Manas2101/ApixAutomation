# APIX Automation Tool - JSON Implementation Summary

## ✅ Phase 1: Backend Implementation (COMPLETE)

### 1. JSON Generation (Instead of YAML)
- **Function**: `validate_and_generate_json()` (renamed from `generate_apix_yaml`)
- **Output Format**: JSON with `apiMetaData` wrapper structure
- **File Name**: `apix-metadata.json`

### 2. Validation Rules Implemented
All validation rules from requirements:

#### **Mandatory Fields**
- `apiTechnicalName` (required)
- `version` (required)

#### **Mandatory Sections** (must always exist, even if empty)
- `platform`
- `snowData`
- `sourceCode`

#### **Field Validations**
- **apiTechnicalName**: Regex `/^[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?$/` (no leading/trailing hyphens)
- **lifecycleStatus**: Enum `['ACTIVE', 'INACTIVE', 'DEPRECATED', 'DEVELOPMENT']` + auto-uppercase
- **classification**: Enum `['INTERNAL', 'EXTERNAL', 'CONFIDENTIAL', 'PUBLIC']` + auto-uppercase
- **countryCode**: Regex `/^[A-Z]{2}$/` + auto-uppercase (2 chars)
- **groupMemberCode**: Regex `/^[A-Z]{4}$/` + auto-uppercase (4 chars)

#### **Field Name Changes**
- `Platform` → `platform` (lowercase)
- `businessApplicationID` → `businessApplicationId` (Id not ID)

### 3. API Endpoints

#### **Search & Generate**
- `POST /api/search` - Search APIs by repo URL
- `POST /api/generate-json` - Generate JSON from search results

#### **Validation**
- `POST /api/validate` - Validate JSON against APIX API
  - Endpoint: `https://api-hub-dev.uk.hsbc/validate`
  - Returns: `{valid: boolean, message: string, errors/details: object}`

#### **Create PR**
- `POST /api/create-pr` - Create PR with JSON file
  - File: `apix-metadata.json`
  - Branch: `apix-metadata-YYYYMMDD-HHMMSS`

#### **Upload Flow** (existing)
- `POST /api/upload-excel` - Upload transposed Excel
- `POST /api/generate-json-from-upload` - Generate JSON from upload

### 4. Dynamic Field Mapping
Single source of truth in `FIELD_MAPPING`:
```python
FIELD_MAPPING = {
    'api_technical_name': 'apiTechnicalName',
    'snow_business_application_id': 'snowData.businessApplicationId',
    'gateway_type': 'platform.provider',
    # ... add new fields here
}
```

**Auto-detection**: Unknown fields automatically converted `snake_case` → `camelCase`

### 5. JSON Output Structure
```json
{
  "apiMetaData": {
    "apiMetaDataList": [
      {
        "apiTechnicalName": "PaymentAPI",
        "version": "V1",
        "classification": "INTERNAL",
        "lifecycleStatus": "ACTIVE",
        "snowData": {
          "businessApplicationId": "BA001",
          "applicationServiceId": "AS001"
        },
        "platform": {
          "provider": "GCP",
          "technology": "REST",
          "team": "Platform Team"
        },
        "sourceCode": {
          "url": "https://github.com/...",
          "reference": "main"
        },
        "consumingCountryGroups": [
          {
            "countryCode": "GB",
            "groupMemberCode": "HBEU"
          }
        ]
      }
    ]
  }
}
```

---

## 🔄 Phase 2: Frontend Implementation (NEXT)

### Required Changes:

1. **Add Radio Buttons** for flow selection:
   - ✅ **Validate & Create PR** (default)
   - ⏸️ **Validate & Publish** (leave as-is for now)

2. **Update API Calls**:
   - Change `/api/generate-yaml` → `/api/generate-json`
   - Response: `{json: string, filename: string}`
   - Display JSON instead of YAML

3. **Add Validation Step** (for "Validate & Create PR" flow):
   - Call `/api/validate` before creating PR
   - Show validation results
   - Only proceed to PR if validation passes

4. **Update UI Labels**:
   - "Generate YAML" → "Generate JSON"
   - "YAML Preview" → "JSON Preview"
   - File download: `apix-metadata.json`

---

## 📋 Testing Checklist

- [ ] Search by repo URL
- [ ] Generate JSON with all fields
- [ ] Validate mandatory fields
- [ ] Validate enum values (uppercase conversion)
- [ ] Validate regex patterns
- [ ] Validate against APIX API
- [ ] Create PR with JSON file
- [ ] Test with transposed Excel upload

---

## 🚀 Next Steps

1. Update frontend with radio buttons
2. Implement validation flow
3. Test end-to-end
4. Deploy to production
