import React, { useState, useEffect } from 'react';

const Options = () => {
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);
  
  useEffect(() => {
    // Load saved API key
    chrome.storage.sync.get(['huggingfaceApiKey'], (result) => {
      if (result.huggingfaceApiKey) {
        setApiKey(result.huggingfaceApiKey);
      }
    });
  }, []);
  
  const handleSave = () => {
    chrome.storage.sync.set({
      huggingfaceApiKey: apiKey
    }, () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  };
  
  return (
    <div className="container p-4">
      <h1 className="text-2xl font-bold mb-4">AI Tab Manager Options</h1>
      
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">AI Classification Settings</h2>
        <div className="bg-white p-4 rounded shadow">
          <label className="block mb-2">
            HuggingFace API Key (optional)
            <input
              type="password"
              className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="hf_..."
            />
          </label>
          <p className="text-sm text-gray-600 mb-4">
            Adding an API key will increase the rate limit for AI-powered tab classification.
            Get your free API key at{' '}
            <a
              href="https://huggingface.co/settings/tokens"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              HuggingFace
            </a>
          </p>
          <button
            onClick={handleSave}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Save Settings
          </button>
          {saved && (
            <span className="ml-3 text-green-600">Settings saved!</span>
          )}
        </div>
      </div>
      
      {/* ... other options ... */}
    </div>
  );
};

export default Options; 