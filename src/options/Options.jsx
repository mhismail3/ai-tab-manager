import React, { useState, useEffect } from 'react';
import './styles.css';

const Options = () => {
  const [settings, setSettings] = useState({
    tabLimit: 10,
    closeStrategy: 'oldest',
    excludedDomains: []
  });

  useEffect(() => {
    // Load settings from storage when component mounts
    chrome.storage.sync.get(['tabLimit', 'closeStrategy', 'excludedDomains'], (result) => {
      if (Object.keys(result).length) {
        setSettings({
          tabLimit: result.tabLimit || 10,
          closeStrategy: result.closeStrategy || 'oldest',
          excludedDomains: result.excludedDomains || []
        });
      }
    });
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: name === 'tabLimit' ? parseInt(value, 10) : value
    }));
  };

  const handleSave = () => {
    chrome.storage.sync.set(settings, () => {
      alert('Settings saved!');
    });
  };

  return (
    <div className="options-container">
      <h1>AI Tab Manager Settings</h1>
      
      <div className="option-group">
        <label htmlFor="tabLimit">Maximum number of tabs:</label>
        <input 
          type="number" 
          id="tabLimit"
          name="tabLimit"
          min="1"
          max="100"
          value={settings.tabLimit}
          onChange={handleChange}
        />
      </div>

      <div className="option-group">
        <label htmlFor="closeStrategy">When limit is reached, close:</label>
        <select 
          id="closeStrategy"
          name="closeStrategy"
          value={settings.closeStrategy}
          onChange={handleChange}
        >
          <option value="oldest">Oldest tabs</option>
          <option value="leastUsed">Least recently used tabs</option>
        </select>
      </div>

      <button className="save-button" onClick={handleSave}>
        Save Settings
      </button>
    </div>
  );
};

export default Options; 