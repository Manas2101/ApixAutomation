import React, { useState } from 'react';
import { Search, FileText, Eye, GitPullRequest, CheckCircle, XCircle, Loader, Github } from 'lucide-react';
import axios from 'axios';

// API base URL - uses proxy in dev, direct URL in production or if proxy fails
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

function App() {
  const [repoUrl, setRepoUrl] = useState('');
  const [githubToken, setGithubToken] = useState('');
  const [apiData, setApiData] = useState(null);
  const [selectedApiIndex, setSelectedApiIndex] = useState(0);
  const [yamlContent, setYamlContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [prUrl, setPrUrl] = useState('');

  const handleSearch = async () => {
    if (!repoUrl.trim()) {
      setError('Please enter a repository URL');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    setApiData(null);
    setYamlContent('');
    setShowPreview(false);
    setPrUrl('');

    try {
      const response = await axios.post(`${API_BASE_URL}/api/search`, {
        repository_url: repoUrl
      });

      if (response.data.found) {
        setApiData(response.data.data);
        setSelectedApiIndex(0); // Reset to first API
        const count = response.data.count || 1;
        setSuccess(`Found ${count} API${count > 1 ? 's' : ''} in this repository!`);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Repository not found in the database');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateYaml = async () => {
    setLoading(true);
    setError('');
    setYamlContent('');
    setShowPreview(false);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/generate-yaml`, {
        repository_url: repoUrl
      });

      setYamlContent(response.data.yaml);
      setSuccess('YAML file generated successfully!');
    } catch (err) {
      setError('Failed to generate YAML file');
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = () => {
    setShowPreview(!showPreview);
  };

  const handleCreatePR = async () => {
    if (!githubToken.trim()) {
      setError('Please enter your GitHub Personal Access Token');
      return;
    }

    setLoading(true);
    setError('');
    setPrUrl('');

    try {
      const response = await axios.post(`${API_BASE_URL}/api/create-pr`, {
        repository_url: repoUrl,
        yaml_content: yamlContent,
        github_token: githubToken
      });

      if (response.data.success) {
        setPrUrl(response.data.pr_url);
        setSuccess(`Pull request created successfully! PR #${response.data.pr_number}`);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create pull request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-800 mb-4">
            APIX Automation Tool
          </h1>
          <p className="text-xl text-gray-600">
            Automate APIX YAML metadata file generation for API repository audits
          </p>
        </div>

        {/* Main Card */}
        <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl p-8">
          {/* Repository Input Section */}
          <div className="mb-8">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              GitHub Repository URL
            </label>
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
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2 font-semibold"
              >
                {loading ? (
                  <Loader className="animate-spin" size={20} />
                ) : (
                  <Search size={20} />
                )}
                Search
              </button>
            </div>
          </div>

          {/* Status Messages */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg flex items-start gap-3">
              <XCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 rounded-lg flex items-start gap-3">
              <CheckCircle className="text-green-500 flex-shrink-0 mt-0.5" size={20} />
              <p className="text-green-700">{success}</p>
            </div>
          )}

          {/* API Data Display - With Dropdown for Multiple APIs */}
          {apiData && (
            <div className="mb-8 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <FileText size={20} />
                  API Information ({Array.isArray(apiData) ? apiData.length : 1} API{Array.isArray(apiData) && apiData.length > 1 ? 's' : ''})
                </h3>
                
                {/* Dropdown for multiple APIs */}
                {Array.isArray(apiData) && apiData.length > 1 && (
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-semibold text-gray-600">Select API:</label>
                    <select
                      value={selectedApiIndex}
                      onChange={(e) => setSelectedApiIndex(Number(e.target.value))}
                      className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500 bg-white"
                    >
                      {apiData.map((api, index) => (
                        <option key={index} value={index}>
                          {index + 1}. {api.api_technical_name} (v{api.version})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              
              {/* Display selected API */}
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
                          <a href={api.api_contract_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                            {api.api_contract_url}
                          </a>
                        </div>
                      )}
                      {api.documentation_url && (
                        <div className="col-span-2">
                          <p className="text-sm font-semibold text-gray-600">Documentation URL</p>
                          <a href={api.documentation_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                            {api.documentation_url}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
              
              {/* Info message about YAML generation */}
              {Array.isArray(apiData) && apiData.length > 1 && (
                <div className="p-3 bg-blue-50 border-l-4 border-blue-500 rounded">
                  <p className="text-sm text-blue-700">
                    <strong>Note:</strong> YAML will be generated for all {apiData.length} APIs in this repository.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          {apiData && (
            <div className="mb-8 flex gap-4">
              <button
                onClick={handleGenerateYaml}
                disabled={loading}
                className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 font-semibold"
              >
                {loading ? (
                  <Loader className="animate-spin" size={20} />
                ) : (
                  <FileText size={20} />
                )}
                Auto Generate YAML
              </button>

              {yamlContent && (
                <button
                  onClick={handlePreview}
                  className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 font-semibold"
                >
                  <Eye size={20} />
                  {showPreview ? 'Hide Preview' : 'Preview YAML'}
                </button>
              )}
            </div>
          )}

          {/* YAML Preview */}
          {yamlContent && showPreview && (
            <div className="mb-8">
              <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                <Eye size={20} />
                YAML Preview
              </h3>
              <pre className="bg-gray-900 text-green-400 p-6 rounded-lg overflow-x-auto text-sm font-mono border-2 border-gray-700">
                {yamlContent}
              </pre>
            </div>
          )}

          {/* GitHub Token and PR Creation */}
          {yamlContent && (
            <div className="border-t-2 border-gray-200 pt-8">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Github size={20} />
                Create Pull Request
              </h3>
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  GitHub Personal Access Token
                </label>
                <input
                  type="password"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Need a token? Create one at{' '}
                  <a
                    href="https://github.com/settings/tokens"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    GitHub Settings
                  </a>
                  {' '}with 'repo' scope
                </p>
              </div>

              <button
                onClick={handleCreatePR}
                disabled={loading || !githubToken}
                className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 font-semibold"
              >
                {loading ? (
                  <Loader className="animate-spin" size={20} />
                ) : (
                  <GitPullRequest size={20} />
                )}
                Create Pull Request
              </button>

              {prUrl && (
                <div className="mt-4 p-4 bg-green-50 border-2 border-green-500 rounded-lg">
                  <p className="text-green-700 font-semibold mb-2">
                    Pull Request Created Successfully!
                  </p>
                  <a
                    href={prUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline break-all"
                  >
                    {prUrl}
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-600">
          <p className="text-sm">
            APIX Automation Tool - Streamlining API Repository Audits
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
