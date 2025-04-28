import React, { useState, useEffect } from 'react';
import { FiPlus, FiSearch, FiCpu, FiClipboard, FiSettings, FiLayers } from 'react-icons/fi';
import TabList from '../components/TabList';
import SearchBar from '../components/SearchBar';
import QuickActions from '../components/QuickActions';
import SuggestionCard from '../components/SuggestionCard';

const Popup = () => {
  const [tabs, setTabs] = useState([]);
  const [tabGroups, setTabGroups] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [suggestion, setSuggestion] = useState(null);

  useEffect(() => {
    // Fetch current tabs from Chrome API
    chrome.tabs.query({}, (allTabs) => {
      setTabs(allTabs);
      setLoading(false);
      
      // For demo purposes, let's pretend we've analyzed the tabs
      if (allTabs.length > 5) {
        setSuggestion({
          type: 'cleanup',
          message: `You have ${allTabs.length} tabs open. Would you like to organize them into groups?`,
          action: 'Organize Tabs'
        });
      }
    });

    // Fetch existing tab groups
    chrome.tabGroups && chrome.tabGroups.query({}, (groups) => {
      setTabGroups(groups || []);
    });
  }, []);

  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  const handleOpenDashboard = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
  };
  
  const handleOpenOptions = () => {
    chrome.runtime.openOptionsPage();
  };

  const handleOrganizeTabs = () => {
    chrome.runtime.sendMessage({ action: 'organizeTabs' }, (response) => {
      if (response && response.success) {
        setSuggestion(null);
      }
    });
  };

  // Filter tabs by search query
  const filteredTabs = tabs.filter(tab => 
    tab.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tab.url.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="popup">
      <header className="header bg-gradient">
        <div className="container flex justify-between items-center">
          <h1 className="title" style={{ color: 'white', margin: 0, fontSize: '18px' }}>
            AI Tab Manager
          </h1>
          <div className="flex gap-2">
            <button 
              className="btn-icon" 
              onClick={handleOpenDashboard}
              title="Open Dashboard"
            >
              <FiLayers color="white" size={20} />
            </button>
            <button 
              className="btn-icon" 
              onClick={handleOpenOptions}
              title="Settings"
            >
              <FiSettings color="white" size={20} />
            </button>
          </div>
        </div>
      </header>

      <div className="container">
        <SearchBar 
          onSearch={handleSearch} 
          placeholder="Search tabs by title or URL..."
        />
        
        <QuickActions />
        
        {suggestion && (
          <SuggestionCard 
            suggestion={suggestion} 
            onAction={handleOrganizeTabs}
            onDismiss={() => setSuggestion(null)}
          />
        )}
        
        <div className="tab-section mt-4">
          <h2 style={{ fontSize: '16px', fontWeight: 600 }}>Current Tabs ({filteredTabs.length})</h2>
          <TabList 
            tabs={filteredTabs} 
            loading={loading}
            showFavIcon={true}
          />
        </div>
        
        {tabGroups.length > 0 && (
          <div className="tab-groups-section mt-4">
            <h2 style={{ fontSize: '16px', fontWeight: 600 }}>Tab Groups</h2>
            <ul className="tab-groups-list">
              {tabGroups.map(group => (
                <li key={group.id} style={{ color: group.color }}>
                  {group.title || 'Unnamed group'} ({group.tabIds?.length || 0})
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      
      <footer className="footer" style={{ textAlign: 'center', padding: '12px', borderTop: '1px solid var(--border-color)' }}>
        <button 
          className="btn-primary"
          onClick={handleOpenDashboard}
          style={{ display: 'flex', alignItems: 'center', margin: '0 auto' }}
        >
          <FiCpu style={{ marginRight: '6px' }} /> AI Insights Dashboard
        </button>
      </footer>
    </div>
  );
};

export default Popup; 