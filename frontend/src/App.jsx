import React, { useState } from 'react';

import { Search, FileText, Eye, GitPullRequest, CheckCircle, XCircle, Loader, Shield, RefreshCw, Send } from 'lucide-react';

 

import axios from 'axios';

 

 

 

// API base URL - uses proxy in dev, direct URL in production or if proxy fails

 

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

 

 

 

function App() {

 

  const [repoUrl, setRepoUrl] = useState('');

 

  const [apiData, setApiData] = useState(null);

 

  const [selectedApiIndex, setSelectedApiIndex] = useState(0);

 

  const [jsonContent, setJsonContent] = useState('');

 

  const [showPreview, setShowPreview] = useState(false);

 

 

 

  // Loading states

 

  const [loading, setLoading] = useState(false); // general (search / generate)

 

  const [loadingValidate, setLoadingValidate] = useState(false);

 

  const [loadingCreatePR, setLoadingCreatePR] = useState(false);

 

  const [loadingPRStatus, setLoadingPRStatus] = useState(false);

 

  const [loadingPublish, setLoadingPublish] = useState(false);

 

 

 

  // Result / status states

 

  const [validationResult, setValidationResult] = useState(null);

 

  const [prStatus, setPrStatus] = useState(null);

 

  const [publishResult, setPublishResult] = useState(null);

 

  const [prUrl, setPrUrl] = useState('');

 

 

 

  // Messaging

 

  const [error, setError] = useState('');

 

  const [success, setSuccess] = useState('');

 

 

 

  // --- Handlers ---

 

  const handleSearch = async () => {

 

    if (!repoUrl.trim()) {

 

      setError('Please enter a repository URL');

 

      return;

 

    }

 

 

 

    setLoading(true);

 

    setError('');

 

    setSuccess('');

 

    setApiData(null);

 

    setJsonContent('');

 

    setShowPreview(false);

 

    setPrUrl('');

 

    setValidationResult(null);

 

    setPrStatus(null);

 

    setPublishResult(null);

 

 

 

    try {

 

      const response = await axios.post(`${API_BASE_URL}/api/search`, {

 

        repository_url: repoUrl

 

      });

 

 

 

      if (response.data.found) {

 

        setApiData(response.data.data);

 

        setSelectedApiIndex(0);

 

        const count = response.data.count || 1;

 

        setSuccess(`Found ${count} API${count > 1 ? 's' : ''} in this repository!`);

 

      } else {

 

        setError('Repository not found in database');

 

      }

 

    } catch (err) {

 

      setError(err.response?.data?.message || 'Repository not found in the database');

 

    } finally {

 

      setLoading(false);

 

    }

 

  };

  const getPrButtonConfig = () => {
    // No status fetched yet: first action should be to check status
    if (!prStatus) {
      return {
        label: 'Check Status',
        icon: RefreshCw,
        action: checkPRStatus,
        isLoading: loadingPRStatus,
      };
    }

    // Treat "no PR" OR "PR closed without merge" as needing a new PR
    const noActivePr = 
      !prStatus.pr_exists || 
      (prStatus.pr_state === 'closed' && !prStatus.is_merged);

    if (noActivePr) {
      return {
        label: 'Create PR',
        icon: GitPullRequest,
        action: handleCreatePR,
        isLoading: loadingCreatePR,
      };
    }

    // PR exists and is merged: allow creating a new PR for updated metadata
    if (prStatus.is_merged) {
      return {
        label: 'Create New PR',
        icon: GitPullRequest,
        action: handleCreatePR,
        isLoading: loadingCreatePR,
      };
    }

    // Default: PR exists and is open (or in some other non-closed state)
    return {
      label: 'Check Status',
      icon: RefreshCw,
      action: checkPRStatus,
      isLoading: loadingPRStatus,
    };
  };

 

 

 

  const handleGenerateJson = async () => {

 

    if (!apiData) return;

 

    setLoading(true);

 

    setError('');

 

    setSuccess('');

 

    setJsonContent('');

 

    setShowPreview(false);

 

    setValidationResult(null);

 

 

 

    try {

 

      const response = await axios.post(`${API_BASE_URL}/api/generate-json`, {

 

        repository_url: repoUrl

 

      });

 

      setJsonContent(response.data.json);

 

      setSuccess('JSON file generated successfully!');

 

    } catch (err) {

 

      setError(err.response?.data?.error || 'Failed to generate JSON file');

 

    } finally {

 

      setLoading(false);

 

    }

 

  };

 

 

 

  const handlePreview = () => {

 

    if (!jsonContent) return;

 

    setShowPreview(!showPreview);

 

  };

 

 

 

  const handleValidate = async () => {

 

    if (!jsonContent) {

 

      setError('Please generate JSON first');

 

      return;

 

    }

 

    setLoadingValidate(true);

 

    setError('');

 

    setSuccess('');

 

    setValidationResult(null);

 

 

 

    try {

 

      const response = await axios.post(`${API_BASE_URL}/api/validate`, {

 

        json_content: jsonContent

 

      });

 

      setValidationResult(response.data);

 

      if (response.data.valid) {

 

        setSuccess('✅ JSON validation passed!');

 

      } else {

 

        setError('❌ JSON validation failed. Check errors below.');

 

      }

 

    } catch (err) {

 

      setValidationResult({

 

        valid: false,

 

        message: 'Validation failed',

 

        errors: err.response?.data?.errors || { error: err.message }

 

      });

 

      setError('❌ JSON validation failed');

 

    } finally {

 

      setLoadingValidate(false);

 

    }

 

  };

 

 

 

  const handleCreatePR = async () => {

 

    if (!validationResult || !validationResult.valid) {

 

      setError('Please validate the JSON successfully first');

 

      return;

 

    }

 

    setLoadingCreatePR(true);

 

    setError('');

 

    setSuccess('Creating pull request...');

 

    setPrUrl('');

 

 

 

    try {

 

      const response = await axios.post(`${API_BASE_URL}/api/create-pr`, {

 

        repository_url: repoUrl,

 

        json_content: jsonContent

 

      });

 

 

 

      if (response.data.success) {

        setPrUrl(response.data.pr_url);

        setSuccess(`✅ Pull request created successfully! PR #${response.data.pr_number}`);

       

        // Automatically check PR status after creating PR

        setTimeout(() => {

          checkPRStatus();

        }, 1000);

      } else {

        setError(response.data.error || 'Failed to create pull request');

      }

 

    } catch (err) {

 

      setError(err.response?.data?.error || 'Failed to create pull request');

 

    } finally {

 

      setLoadingCreatePR(false);

 

    }

 

  };

 

 

 

  const checkPRStatus = async () => {

    if (!repoUrl.trim()) {

      setError('Please enter a repository URL first');

      return;

    }

 

    setLoadingPRStatus(true);

    setError('');

    setSuccess('Checking PR status...');

    setPrStatus(null);

 

    try {

      const response = await axios.post(`${API_BASE_URL}/api/check-pr-status`, {

        repository_url: repoUrl

      });

 

      setPrStatus(response.data);

     

      if (response.data.can_publish) {

        setSuccess(response.data.message);

      } else if (response.data.pr_exists) {

        setSuccess(response.data.message);

      } else {

        setSuccess(response.data.message); // Changed from setError to setSuccess for "No PR found" message

      }

    } catch (err) {

      console.error('PR Status Error:', err);

      setError(err.response?.data?.error || 'Failed to check PR status');

    } finally {

      setLoadingPRStatus(false);

    }

  };

 

 

 

  const handlePublish = async () => {

 

    if (!prStatus || !prStatus.can_publish) {

 

      setError('Cannot publish: merged PR required');

 

      return;

 

    }

 

    setLoadingPublish(true);

 

    setError('');

 

    setSuccess('Publishing API metadata...');

 

    setPublishResult(null);

 

 

 

    try {

 

      const response = await axios.post(`${API_BASE_URL}/api/publish`, {

 

        repository_url: repoUrl

 

      });

 

      if (response.data.success) {

 

        setPublishResult(response.data);

 

        setSuccess(response.data.message);

 

      } else {

 

        setError(response.data.error || 'Failed to publish');

 

      }

 

    } catch (err) {

 

      setError(err.response?.data?.error || 'Failed to publish API metadata');

 

    } finally {

 

      setLoadingPublish(false);

 

    }

 

  };

 

 

 

  return (

 

    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">

 

      <div className="container mx-auto px-4 py-8">

 

        {/* Header */}

 

        <div className="text-center mb-12">

 

          <h1 className="text-5xl font-bold text-gray-800 mb-4">APIX Automation Tool</h1>

 

          <p className="text-xl text-gray-600">Automate APIX JSON metadata file generation for API repository audits</p>

 

        </div>

 

 

 

        {/* Main Card */}

 

        <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl p-8">

 

          {/* Repository Input */}

 

          <div className="mb-8">

 

            <label className="block text-sm font-semibold text-gray-700 mb-2">GitHub Repository URL</label>

 

            <div className="flex gap-3">

 

              <input

 

                type="text"

 

                value={repoUrl}

 

                onChange={(e) => setRepoUrl(e.target.value)}

 

                placeholder="https://github.com/example/payment-api"

 

                className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"

 

                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}

 

              />

 

              <button

                onClick={handleSearch}

                disabled={loading}

                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"

              >

                {loading ? <Loader className="animate-spin" size={20} /> : <Search size={20} />}

                Search Repository

              </button>

 

            </div>

 

          </div>

 

 

 

          {/* Inline Alerts just under search */}

 

          {(error || success) && (

 

            <div className="mb-8 space-y-4">

 

              {error && (

 

                <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded">

 

                  <p className="text-sm text-red-700 font-semibold">{error}</p>

 

                </div>

 

              )}

 

              {success && (

 

                <div className="p-4 bg-green-50 border-l-4 border-green-500 rounded">

 

                  <p className="text-sm text-green-700 font-semibold">{success}</p>

 

                </div>

 

              )}

 

            </div>

 

          )}

 

 

 

          {/* API Data Display */}

 

          {apiData && (

 

            <div className="mb-8 space-y-4">

 

              <div className="flex items-center justify-between">

 

                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">

 

                  <FileText size={20} />

 

                  API Information ({Array.isArray(apiData) ? apiData.length : 1} API{Array.isArray(apiData) && apiData.length > 1 ? 's' : ''})

 

                </h3>

 

                {Array.isArray(apiData) && apiData.length > 1 && (

 

                  <div className="flex items-center gap-2">

 

                    <label className="text-sm font-semibold text-gray-600">Select API:</label>

 

                    <select

 

                      value={selectedApiIndex}

 

                      onChange={(e) => setSelectedApiIndex(Number(e.target.value))}

 

                      className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500 bg-white"

 

                    >

 

                      {apiData.map((api, index) => (

 

                        <option key={index} value={index}>{index + 1}. {api.api_technical_name} (v{api.version})</option>

 

                      ))}

 

                    </select>

 

                  </div>

 

                )}

 

              </div>

 

              {(() => {

 

                const api = Array.isArray(apiData) ? apiData[selectedApiIndex] : apiData;

 

                return (

 

                  <div className="p-6 bg-gray-50 rounded-lg border-2 border-gray-200">

 

                    <div className="grid grid-cols-2 gap-4">

 

                      <div>

 

                        <p className="text-sm font-semibold text-gray-600">Technical Name</p>

 

                        <p className="text-gray-800">{api.api_technical_name}</p>

 

                      </div>

 

                      <div>

 

                        <p className="text-sm font-semibold text-gray-600">Version</p>

 

                        <p className="text-gray-800">{api.version}</p>

 

                      </div>

 

                      <div>

 

                        <p className="text-sm font-semibold text-gray-600">Platform</p>

 

                        <p className="text-gray-800 uppercase">{api.platform}</p>

 

                      </div>

 

                      <div>

 

                        <p className="text-sm font-semibold text-gray-600">Lifecycle Status</p>

 

                        <p className="text-gray-800 uppercase">{api.lifecycle_status}</p>

 

                      </div>

 

                      <div>

 

                        <p className="text-sm font-semibold text-gray-600">Classification</p>

 

                        <p className="text-gray-800 uppercase">{api.classification}</p>

 

                      </div>

 

                      <div>

 

                        <p className="text-sm font-semibold text-gray-600">SNOW Business App ID</p>

 

                        <p className="text-gray-800">{api.snow_business_application_id}</p>

 

                      </div>

 

                      {api.snow_application_service_id && (

 

                        <div>

 

                          <p className="text-sm font-semibold text-gray-600">SNOW Application Service ID</p>

 

                          <p className="text-gray-800">{api.snow_application_service_id}</p>

 

                        </div>

 

                      )}

 

                      {api.api_hosting_country && (

 

                        <div>

 

                          <p className="text-sm font-semibold text-gray-600">Hosting Country</p>

 

                          <p className="text-gray-800">{api.api_hosting_country}</p>

 

                        </div>

 

                      )}

 

                      {api.gateway_type && (

 

                        <div className="col-span-2">

 

                          <p className="text-sm font-semibold text-gray-600">Gateway Type</p>

 

                          <p className="text-gray-800">{api.gateway_type}</p>

 

                        </div>

 

                      )}

 

                      {api.api_contract_url && (

 

                        <div className="col-span-2">

 

                          <p className="text-sm font-semibold text-gray-600">API Contract URL</p>

 

                          <a href={api.api_contract_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{api.api_contract_url}</a>

 

                        </div>

 

                      )}

 

                      {api.documentation_url && (

 

                        <div className="col-span-2">

 

                          <p className="text-sm font-semibold text-gray-600">Documentation URL</p>

 

                          <a href={api.documentation_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{api.documentation_url}</a>

 

                        </div>

 

                      )}

 

                    </div>

 

                  </div>

 

                );

 

              })()}

 

              {Array.isArray(apiData) && apiData.length > 1 && (

 

                <div className="p-3 bg-blue-50 border-l-4 border-blue-500 rounded">

 

                  <p className="text-sm text-blue-700"><strong>Note:</strong> JSON will be generated for all {apiData.length} APIs in this repository.</p>

 

                </div>

 

              )}

 

            </div>

 

          )}

 

 

 

          {/* Generate / Preview */}

          {apiData && (

            <div className="mb-8 space-y-4">

              <button

                onClick={handleGenerateJson}

                disabled={loading}

                className="w-full px-6 py-4 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl hover:from-indigo-700 hover:to-indigo-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-3 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"

              >

                {loading ? <Loader className="animate-spin" size={24} /> : <FileText size={24} />}

                Generate JSON Metadata

              </button>

 

              {jsonContent && (

                <button

                  onClick={handlePreview}

                  className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all duration-200 flex items-center justify-center gap-3 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"

                >

                  <Eye size={24} />

                  {showPreview ? 'Hide JSON Preview' : 'Preview Generated JSON'}

                </button>

              )}

            </div>

          )}

 

 

 

          {/* Validation Result */}

 

          {validationResult && (

 

            <div className={`mb-6 p-4 rounded-lg border-l-4 ${validationResult.valid ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'}`}>

 

              <div className="flex items-start gap-3 overflow-x-auto">

 

                {validationResult.valid ? (

 

                  <CheckCircle className="text-green-500 flex-shrink-0 mt-0.5" size={20} />

 

                ) : (

 

                  <XCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />

 

                )}

 

                <div className="flex-1">

 

                  <p className={`font-semibold ${validationResult.valid ? 'text-green-700' : 'text-red-700'}`}>{validationResult.message}</p>

 

                  {validationResult.errors && (

 

                    <pre className="mt-2 text-sm text-gray-700 overflow-auto max-h-40">{JSON.stringify(validationResult.errors, null, 2)}</pre>

 

                  )}

 

                  {validationResult.details && Object.keys(validationResult.details).length > 0 && (

 

                    <pre className="mt-2 text-sm text-gray-700 overflow-auto max-h-40">{JSON.stringify(validationResult.details, null, 2)}</pre>

 

                  )}

 

                </div>

 

              </div>

 

            </div>

 

          )}

 

 

 

          {/* JSON Preview */}

 

          {jsonContent && showPreview && (

 

            <div className="mb-8">

 

              <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">

 

                <Eye size={20} />

 

                JSON Preview

 

              </h3>

 

              <pre className="bg-gray-900 text-green-400 p-6 rounded-lg overflow-x-auto text-sm font-mono border-2 border-gray-700 max-h-96">

 

                {jsonContent}

 

              </pre>

 

            </div>

 

          )}

 

 

 

          {/* Workflow Section */}

          {jsonContent && showPreview && (

            <div className="mt-8 border-t-2 border-gray-200 pt-8">

              <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">

                <GitPullRequest size={24} />

                Workflow Actions

              </h3>

             

              {/* Step-by-step workflow */}

              <div className="space-y-4">

               

                {/* Step 1: Validate */}

                <div className="bg-white border-2 border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">

                  <div className="flex items-center justify-between mb-4">

                    <div className="flex items-center gap-3">

                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${

                        validationResult?.valid ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'

                      }`}>

                        1

                      </div>

                      <div>

                        <h4 className="font-semibold text-gray-800">Validate JSON</h4>

                        <p className="text-sm text-gray-600">Verify JSON against APIX API standards</p>

                      </div>

                    </div>

                    {!validationResult?.valid && (
                      <button
                        onClick={handleValidate}
                        disabled={loadingValidate}
                        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                      >

                        {loadingValidate ? <Loader className="animate-spin" size={20} /> : <Shield size={20} />}

                        Validate

                      </button>
                    )}

                  </div>

                  {validationResult?.valid && (

                    <div className="flex items-center gap-2 text-green-700 bg-green-50 px-3 py-2 rounded-lg">

                      <CheckCircle size={16} />

                      <span className="text-sm font-medium">JSON validation successful!</span>

                    </div>

                  )}

                </div>

 

                {/* Step 2: Check PR Status / Create PR */}

                {validationResult?.valid && (

                  <div className="bg-white border-2 border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">

                    <div className="flex items-center justify-between mb-4">

                      <div className="flex items-center gap-3">

                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${

                          prStatus ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'

                        }`}>

                          2

                        </div>

                        <div>

                          <h4 className="font-semibold text-gray-800">Pull Request Management</h4>

                          <p className="text-sm text-gray-600">Check existing PR status or create new PR</p>

                        </div>

                      </div>

                      <div className="flex gap-3">

                        {/* Single button that either checks PR status or creates PR based on current status */}
                        {(() => {
                          const { label, icon: Icon, action, isLoading } = getPrButtonConfig();
                          return (
                            <button
                              onClick={action}
                              disabled={isLoading}
                              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg hover:from-indigo-700 hover:to-indigo-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                            >

                              {isLoading ? <Loader className="animate-spin" size={20} /> : <Icon size={20} />}

                              {label}

                            </button>
                          );
                        })()}

                      </div>

                    </div>

                  </div>

                )}

 

                {/* Step 3: Publish (only if PR is merged) */}

                {prStatus?.can_publish && (

                  <div className="bg-white border-2 border-green-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">

                    <div className="flex items-center justify-between mb-4">

                      <div className="flex items-center gap-3">

                        <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-sm font-bold">

                          3

                        </div>

                        <div>

                          <h4 className="font-semibold text-gray-800">Publish API Metadata</h4>

                          <p className="text-sm text-gray-600">Deploy validated metadata to APIX registry</p>

                        </div>

                      </div>

                      <button

                        onClick={handlePublish}

                        disabled={loadingPublish}

                        className="px-8 py-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-lg"

                      >

                        {loadingPublish ? <Loader className="animate-spin" size={24} /> : <Send size={24} />}

                        Publish to APIX

                      </button>

                    </div>

                  </div>

                )}

              </div>

 

 

 

              {/* Status Messages */}

              {prStatus && (

                <div className={`mt-6 p-6 rounded-xl border-2 ${

                  prStatus.can_publish

                    ? 'bg-green-50 border-green-200'

                    : prStatus.pr_exists

                      ? 'bg-yellow-50 border-yellow-200'

                      : 'bg-red-50 border-red-200'

                } shadow-sm`}>

                  <div className="flex items-start gap-3">

                    {prStatus.can_publish ? (

                      <CheckCircle className="text-green-600 flex-shrink-0 mt-1" size={20} />

                    ) : prStatus.pr_exists ? (

                      <RefreshCw className="text-yellow-600 flex-shrink-0 mt-1" size={20} />

                    ) : (

                      <XCircle className="text-red-600 flex-shrink-0 mt-1" size={20} />

                    )}

                    <div className="flex-1">

                      <p className={`font-semibold ${

                        prStatus.can_publish

                          ? 'text-green-800'

                          : prStatus.pr_exists

                            ? 'text-yellow-800'

                            : 'text-red-800'

                      }`}>

                        {prStatus.message}

                      </p>

                      {prStatus.pr_url && (

                        <a

                          href={prStatus.pr_url}

                          target="_blank"

                          rel="noopener noreferrer"

                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium text-sm mt-2 hover:underline"

                        >

                          <GitPullRequest size={16} />

                          View PR #{prStatus.pr_number}

                        </a>

                      )}

                    </div>

                  </div>

                </div>

              )}

 

              {prUrl && (

                <div className="mt-6 p-6 bg-green-50 border-2 border-green-200 rounded-xl shadow-sm">

                  <div className="flex items-start gap-3">

                    <CheckCircle className="text-green-600 flex-shrink-0 mt-1" size={20} />

                    <div className="flex-1">

                      <p className="text-green-800 font-semibold mb-2">Pull Request Created Successfully!</p>

                      <a

                        href={prUrl}

                        target="_blank"

                        rel="noopener noreferrer"

                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium text-sm hover:underline break-all"

                      >

                        <GitPullRequest size={16} />

                        {prUrl}

                      </a>

                    </div>

                  </div>

                </div>

              )}

 

              {publishResult && (

                <div className="mt-6 p-6 bg-purple-50 border-2 border-purple-200 rounded-xl shadow-sm">

                  <div className="flex items-start gap-3">

                    <Send className="text-purple-600 flex-shrink-0 mt-1" size={20} />

                    <div className="flex-1">

                      <p className="text-purple-800 font-semibold mb-3">{publishResult.message}</p>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">

                        <div className="bg-white p-3 rounded-lg border border-purple-200">

                          <p className="text-gray-600 font-medium">Repository</p>

                          <p className="text-gray-800 truncate">{publishResult.repository_url}</p>

                        </div>

                        <div className="bg-white p-3 rounded-lg border border-purple-200">

                          <p className="text-gray-600 font-medium">Published APIs</p>

                          <p className="text-gray-800 font-semibold">{publishResult.published_apis}</p>

                        </div>

                        <div className="bg-white p-3 rounded-lg border border-purple-200">

                          <p className="text-gray-600 font-medium">Timestamp</p>

                          <p className="text-gray-800">{new Date(publishResult.timestamp).toLocaleString()}</p>

                        </div>

                      </div>

                    </div>

                  </div>

                </div>

              )}

 

            </div>

 

          )}

 

        </div>

 

        {/* Footer */}

        <div className="text-center mt-12 text-gray-600">

          <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm p-6">

            <p className="text-lg font-semibold text-gray-800 mb-2">APIX Automation Tool</p>

            <p className="text-sm text-gray-600">

              Streamlining API Repository Audits • Validate • Create PR • Publish

            </p>

            <div className="flex justify-center items-center gap-4 mt-4 text-xs text-gray-500">

              <span>✅ JSON Validation</span>

              <span>•</span>

              <span>🔄 PR Management</span>

              <span>•</span>

              <span>🚀 APIX Publishing</span>

            </div>

          </div>

        </div>

      </div>

    </div>

  );

}

 

 

 

export default App;