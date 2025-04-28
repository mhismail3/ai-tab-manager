import React, { useState, useEffect } from 'react';
import { FiSave, FiCheck } from 'react-icons/fi';

const SettingsForm = () => {
  const [settings, setSettings] = useState({
    tabLimit: 10,
    closeStrategy: 'oldest',
    excludedDomains: [],
    defaultTab: 'overview',
    enableAnalytics: true,
    notifyTabLimit: true,
    notifyTabSuggestions: true
  });
  const [newDomain, setNewDomain] = useState('');
  const [saveStatus, setSaveStatus] = useState('');
  
  useEffect(() => {
    // Load settings from storage when component mounts
    chrome.storage.sync.get([
      'tabLimit', 
      'closeStrategy', 
      'excludedDomains', 
      'defaultTab', 
      'enableAnalytics',
      'notifyTabLimit',
      'notifyTabSuggestions'
    ], (result) => {
      if (Object.keys(result).length) {
        setSettings({
          tabLimit: result.tabLimit || 10,
          closeStrategy: result.closeStrategy || 'oldest',
          excludedDomains: result.excludedDomains || [],
          defaultTab: result.defaultTab || 'overview',
          enableAnalytics: result.enableAnalytics !== false,
          notifyTabLimit: result.notifyTabLimit !== false,
          notifyTabSuggestions: result.notifyTabSuggestions !== false
        });
      }
    });
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const newValue = name === 'tabLimit' ? parseInt(value, 10) : value;
    
    // Update state locally
    setSettings(prev => ({
      ...prev,
      [name]: newValue
    }));
    
    // Send individual setting update to background script for immediate effect
    chrome.runtime.sendMessage({ 
      action: `update${name.charAt(0).toUpperCase() + name.slice(1)}`,
      [name]: newValue
    });
  };

  const handleSave = () => {
    // Update all settings in the background script
    chrome.runtime.sendMessage({ 
      action: 'updateSettings',
      settings: settings
    }, () => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(''), 3000);
    });
  };
  
  const handleAddDomain = (e) => {
    e.preventDefault();
    if (newDomain && !settings.excludedDomains.includes(newDomain)) {
      setSettings(prev => ({
        ...prev,
        excludedDomains: [...prev.excludedDomains, newDomain]
      }));
      setNewDomain('');
    }
  };
  
  const handleRemoveDomain = (domain) => {
    setSettings(prev => ({
      ...prev,
      excludedDomains: prev.excludedDomains.filter(d => d !== domain)
    }));
  };

  const handleCheckboxChange = (settingName) => {
    // Toggle the setting
    const newValue = !settings[settingName];
    
    // Update local state
    setSettings(prev => ({
      ...prev,
      [settingName]: newValue
    }));
    
    // Send individual setting update to background script for immediate effect
    chrome.runtime.sendMessage({ 
      action: `update${settingName.charAt(0).toUpperCase() + settingName.slice(1)}`,
      [settingName]: newValue
    });
  };

  return (
    <div className="settings-form">
      <div className="settings-section">
        <h3 className="settings-section-title">Tab Management</h3>
        
        <div className="form-group">
          <label htmlFor="tabLimit">Maximum number of tabs:</label>
          <input 
            type="number" 
            id="tabLimit"
            name="tabLimit"
            min="1"
            max="100"
            className="form-control"
            value={settings.tabLimit}
            onChange={handleChange}
          />
          <p className="form-help">AI Tab Manager will suggest closing tabs when this limit is reached</p>
        </div>

        <div className="form-group">
          <label htmlFor="closeStrategy">When limit is reached, close:</label>
          <select 
            id="closeStrategy"
            name="closeStrategy"
            className="form-control"
            value={settings.closeStrategy}
            onChange={handleChange}
          >
            <option value="oldest">Oldest tabs</option>
            <option value="leastUsed">Least recently used tabs</option>
          </select>
          <p className="form-help">Method used to determine which tabs to close automatically</p>
        </div>
      </div>
      
      <div className="settings-section">
        <h3 className="settings-section-title">Excluded Domains</h3>
        <p className="form-help">Websites that should be excluded from automatic tab management</p>
        
        <form onSubmit={handleAddDomain} className="domain-form">
          <input
            type="text"
            placeholder="example.com"
            className="form-control"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
          />
          <button type="submit" className="btn btn-outline">Add</button>
        </form>
        
        <div className="domain-list">
          {settings.excludedDomains.length === 0 ? (
            <p className="no-domains">No excluded domains. Add domains above to exclude them from automatic management.</p>
          ) : (
            <ul>
              {settings.excludedDomains.map((domain, index) => (
                <li key={index} className="domain-item">
                  {domain}
                  <button 
                    className="btn-icon domain-remove" 
                    onClick={() => handleRemoveDomain(domain)}
                    title="Remove domain"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      
      <div className="settings-section">
        <h3 className="settings-section-title">Dashboard Preferences</h3>
        
        <div className="form-group">
          <label htmlFor="defaultTab">Default Dashboard Tab:</label>
          <select 
            id="defaultTab"
            name="defaultTab"
            className="form-control"
            value={settings.defaultTab || 'overview'}
            onChange={handleChange}
          >
            <option value="overview">Overview</option>
            <option value="tabs">Current Tabs</option>
            <option value="groups">Tab Groups</option>
            <option value="saved">Saved Groups</option>
            <option value="analytics">Analytics</option>
            <option value="settings">Settings</option>
          </select>
          <p className="form-help">Tab that will be active when opening the dashboard</p>
        </div>
        
        <div className="form-group">
          <div className="checkbox-group">
            <input
              type="checkbox"
              id="enableAnalytics"
              checked={settings.enableAnalytics !== false}
              onChange={() => handleCheckboxChange('enableAnalytics')}
            />
            <label htmlFor="enableAnalytics">Enable tab usage analytics</label>
          </div>
          <p className="form-help">Collect tab usage data to improve suggestions (data stays on your device)</p>
        </div>
      </div>
      
      <div className="settings-section">
        <h3 className="settings-section-title">Notification Preferences</h3>
        
        <div className="form-group">
          <div className="checkbox-group">
            <input
              type="checkbox"
              id="notifyTabLimit"
              checked={settings.notifyTabLimit !== false}
              onChange={() => handleCheckboxChange('notifyTabLimit')}
            />
            <label htmlFor="notifyTabLimit">Notify when tab limit is reached</label>
          </div>
        </div>
        
        <div className="form-group">
          <div className="checkbox-group">
            <input
              type="checkbox"
              id="notifyTabSuggestions"
              checked={settings.notifyTabSuggestions !== false}
              onChange={() => handleCheckboxChange('notifyTabSuggestions')}
            />
            <label htmlFor="notifyTabSuggestions">Notify when tab organization suggestions are available</label>
          </div>
        </div>
      </div>
      
      <div className="form-actions">
        <button 
          className="btn btn-primary" 
          onClick={handleSave}
          style={{ display: 'flex', alignItems: 'center' }}
        >
          {saveStatus === 'saved' ? (
            <>
              <FiCheck className="btn-icon" /> Saved!
            </>
          ) : (
            <>
              <FiSave className="btn-icon" /> Save Settings
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default SettingsForm; 