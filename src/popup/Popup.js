import React, { useState, useEffect } from 'react';
import { FiPlus, FiSearch, FiCpu, FiClipboard, FiSettings, FiLayers } from 'react-icons/fi';
import TabList from '../components/TabList';
import SearchBar from '../components/SearchBar';
import QuickActions from '../components/QuickActions';
import SuggestionCard from '../components/SuggestionCard';

const Toast = ({ message, isVisible, type = 'success' }) => {
  if (!isVisible) return null;
  
  const getBgColor = () => {
    switch (type) {
      case 'success': return 'var(--success)';
      case 'error': return 'var(--danger)';
      case 'info': return 'var(--info)';
      default: return 'var(--success)';
    }
  };
  
  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      backgroundColor: getBgColor(),
      color: 'white',
      padding: '10px 15px',
      borderRadius: '4px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
      zIndex: 1000,
      animation: 'fadeIn 0.3s, fadeOut 0.3s 2.7s',
      animationFillMode: 'forwards'
    }}>
      {message}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeOut {
          from { opacity: 1; transform: translateY(0); }
          to { opacity: 0; transform: translateY(20px); }
        }
      `}</style>
    </div>
  );
};

const Popup = () => {
  const [tabs, setTabs] = useState([]);
  const [tabGroups, setTabGroups] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [suggestion, setSuggestion] = useState(null);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  const loadTabs = () => {
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
  };

  useEffect(() => {
    // Fetch current tabs from Chrome API
    loadTabs();
  }, []);

  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  const handleOpenDashboard = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
  };
  
  const handleOpenOptions = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html?tab=settings') });
  };

  const handleOrganizeTabs = () => {
    setLoading(true);
    chrome.runtime.sendMessage({ action: 'organizeTabs' }, (response) => {
      if (response && response.success) {
        setSuggestion(null);
        setToast({
          visible: true,
          message: response.message || 'Tabs organized successfully!',
          type: 'success'
        });
        
        // Reload tabs to show updated groups
        loadTabs();
      } else {
        setToast({
          visible: true,
          message: response?.error || 'Failed to organize tabs',
          type: 'error'
        });
        setLoading(false);
      }
      
      // Hide toast after 3 seconds
      setTimeout(() => {
        setToast(prev => ({ ...prev, visible: false }));
      }, 3000);
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
          <div style={{ marginTop: '16px' }}>
            <SuggestionCard 
              suggestion={suggestion} 
              onAction={(groupName) => {
                handleOrganizeTabs();
                // Group name might be provided from the card if the user entered a name
                // But for general organize action we don't need it in the popup
                setSuggestion(null);
              }}
              onDismiss={() => setSuggestion(null)}
            />
          </div>
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
      
      <Toast 
        message={toast.message}
        isVisible={toast.visible}
        type={toast.type}
      />
    </div>
  );
};

export default Popup; 