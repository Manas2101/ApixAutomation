# APIX Automation - Edge Cases & Test Plan

## 🚨 **Critical Edge Cases Identified & Solutions**

### **1. Excel Changes After PR Merged** ✅ **FIXED**
**Problem**: If Excel data changes and PR is already merged, creating a new PR fails because branch exists.

**Solution Implemented**:
- New endpoint: `/api/validate-pr-creation` 
- Detects merged PRs and creates versioned branches: `apix_emi123-v20241118-015430`
- Prevents branch name conflicts

**Test Cases**:
```bash
# Test 1: Create PR, merge it, then try to create another PR with changed data
1. Create initial PR → merge it
2. Change Excel data 
3. Generate new JSON
4. Create PR → Should create versioned branch automatically
```

### **2. Multiple PRs for Same Repository** ✅ **FIXED**
**Problem**: Multiple open PRs can exist, which one to track?

**Solution**: 
- Always uses the most recent PR (prs[0])
- Warns user about existing open PR
- Suggests updating existing PR instead of creating new one

### **3. Branch Exists But No PR** ✅ **FIXED**
**Problem**: Branch creation fails, but no PR exists to track.

**Solution**: 
- Validation endpoint checks both branch existence AND PR existence
- Handles orphaned branches gracefully

### **4. Repository Access Issues** ⚠️ **NEEDS TESTING**
**Problems**:
- Invalid GitHub token
- Repository doesn't exist
- Private repository without access
- Network/proxy issues

**Current Handling**:
- Token validation in environment variables
- HTTP status code checking
- Proxy configuration support

**Test Cases Needed**:
```bash
# Test invalid token
export GITHUB_TOKEN="invalid_token"
# Test private repo without access
# Test non-existent repository
# Test network timeout scenarios
```

### **5. Excel File Structure Changes** ⚠️ **HIGH PRIORITY**
**Problems**:
- Column names changed
- New required fields added
- EMI ID format changes
- Missing mandatory data

**Current Handling**: Basic error handling
**Needs**: Comprehensive validation and migration logic

### **6. JSON Generation Failures** ⚠️ **NEEDS IMPROVEMENT**
**Problems**:
- Invalid Excel data
- Missing required fields
- Data type mismatches
- Encoding issues

### **7. API Validation Failures** ⚠️ **NEEDS IMPROVEMENT**
**Problems**:
- APIX validation API down
- Network timeouts
- Invalid JSON structure
- Authentication failures

### **8. GitHub API Rate Limiting** ⚠️ **NOT HANDLED**
**Problem**: GitHub API has rate limits (5000/hour for authenticated requests)

**Solution Needed**: 
- Rate limit detection
- Retry with exponential backoff
- Queue management

### **9. Concurrent User Access** ⚠️ **NOT HANDLED**
**Problem**: Multiple users working on same repository simultaneously

**Potential Issues**:
- Branch conflicts
- File overwrite
- PR conflicts

### **10. Large Repository Handling** ⚠️ **NOT TESTED**
**Problems**:
- Large file uploads
- Timeout issues
- Memory constraints

## 🧪 **Comprehensive Test Scenarios**

### **Scenario A: Happy Path**
1. Search repository ✅
2. Generate JSON ✅
3. Validate JSON ✅
4. Create PR ✅
5. Check PR status ✅
6. Merge PR (manual) ✅
7. Publish ✅

### **Scenario B: Excel Changes After Merge**
1. Complete Scenario A
2. Modify Excel data
3. Generate new JSON
4. Create PR → Should create versioned branch ✅
5. Verify new PR created with different branch name ✅

### **Scenario C: Open PR Exists**
1. Create PR (don't merge)
2. Try to create another PR
3. Should warn about existing open PR ✅
4. Should suggest updating existing PR ✅

### **Scenario D: Closed PR Without Merge**
1. Create PR
2. Close PR without merging
3. Try to create new PR
4. Should allow creating new PR ✅

### **Scenario E: Repository Access Issues**
1. Invalid repository URL
2. Private repository without access
3. Invalid GitHub token
4. Network connectivity issues

### **Scenario F: Data Validation Issues**
1. Invalid Excel format
2. Missing required fields
3. Invalid EMI ID format
4. Corrupted data

### **Scenario G: API Failures**
1. APIX validation API down
2. GitHub API rate limiting
3. Network timeouts
4. Authentication failures

### **Scenario H: Concurrent Access**
1. Multiple users on same repository
2. Simultaneous PR creation
3. Branch conflicts
4. File overwrite scenarios

## 🔧 **Recommended Improvements**

### **High Priority**:
1. **Excel Structure Validation**: Validate Excel columns and data types
2. **Rate Limit Handling**: Implement GitHub API rate limit detection
3. **Retry Logic**: Add exponential backoff for API failures
4. **Content Change Detection**: Compare JSON content to avoid duplicate PRs
5. **Comprehensive Error Messages**: User-friendly error descriptions

### **Medium Priority**:
1. **Concurrent Access Handling**: Lock mechanisms for repository operations
2. **Large File Support**: Handle large repositories and files
3. **Audit Logging**: Track all operations for debugging
4. **Performance Optimization**: Cache API responses where appropriate

### **Low Priority**:
1. **Batch Operations**: Handle multiple repositories at once
2. **Scheduled Operations**: Automated PR creation/updates
3. **Integration Testing**: Automated test suite for all scenarios

## 🚀 **Implementation Status**

✅ **Completed**:
- PR merge status detection fix
- Versioned branch creation for merged PRs
- Multiple PR handling
- Basic error handling
- Edge case validation endpoint

⚠️ **In Progress**:
- Comprehensive error handling
- Test plan execution

❌ **Not Started**:
- Rate limit handling
- Excel structure validation
- Concurrent access handling
- Performance optimization

## 🧪 **Testing Commands**

```bash
# Test the new validation endpoint
curl -X POST http://localhost:5001/api/validate-pr-creation \
  -H "Content-Type: application/json" \
  -d '{"repository_url": "https://github.com/owner/repo", "json_content": "{...}"}'

# Test PR status with merged PR
curl -X POST http://localhost:5001/api/check-pr-status \
  -H "Content-Type: application/json" \
  -d '{"repository_url": "https://github.com/owner/repo"}'

# Test create PR with suggested branch
curl -X POST http://localhost:5001/api/create-pr \
  -H "Content-Type: application/json" \
  -d '{"repository_url": "https://github.com/owner/repo", "json_content": "{...}", "suggested_branch": "apix_emi123-v20241118-015430"}'
```

## 📋 **Manual Testing Checklist**

- [ ] Test with merged PR → new changes → should create versioned branch
- [ ] Test with open PR → should warn about existing PR
- [ ] Test with closed unmerged PR → should allow new PR
- [ ] Test with invalid repository URL
- [ ] Test with invalid GitHub token
- [ ] Test with network connectivity issues
- [ ] Test with large Excel files
- [ ] Test with malformed Excel data
- [ ] Test with missing required fields
- [ ] Test concurrent access scenarios
