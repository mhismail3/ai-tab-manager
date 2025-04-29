import React, { useState, useEffect, lazy, Suspense } from 'react';
// Import only the icons used in the overview tab initially
import { FiRefreshCw, FiCpu, FiTablet, FiLayers, FiSave, FiClock, FiGrid, FiBarChart2, FiSettings } from 'react-icons/fi';

// Lazy load components
const StatCard = lazy(() => import('../components/StatCard'));
const TabList = lazy(() => import('../components/TabList'));
const SavedTabGroups = lazy(() => import('../components/SavedTabGroups'));
const SuggestionCard = lazy(() => import('../components/SuggestionCard'));
const SettingsForm = lazy(() => import('../components/SettingsForm'));
const TabGroups = lazy(() => import('../components/TabGroups'));

// Lazy load tab-specific icons when needed
const loadAdditionalIcons = async () => {
  const module = await import('react-icons/fi');
  return {
    FiFile: module.FiFile,
    FiInbox: module.FiInbox,
    FiActivity: module.FiActivity,
    FiArchive: module.FiArchive,
    FiTrash2: module.FiTrash2
  };
};

// Import functions dynamically
const tabActivityImport = import('../models/tabActivity');
const tabStorageImport = import('../models/tabStorage');
const tabClassifierImport = import('../models/tabClassifier');

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({
    totalTabs: 0,
    totalWindows: 0,
    tabsPerWindow: 0,
    oldestTab: 0,
    savedGroups: 0
  });
  const [tabs, setTabs] = useState([]);
  const [tabGroups, setTabGroups] = useState([]);
  const [savedGroups, setSavedGroups] = useState([]);
  const [cleanupSuggestions, setCleanupSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [additionalIcons, setAdditionalIcons] = useState(null);
  
  useEffect(() => {
    // Load all necessary data
    loadDashboardData();
    
    // Load additional icons if not on overview tab
    if (activeTab !== 'overview' && !additionalIcons) {
      loadAdditionalIcons().then(setAdditionalIcons);
    }
    
    // Check URL parameters for tab selection
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam && ['overview', 'tabs', 'groups', 'saved', 'analytics', 'settings'].includes(tabParam)) {
      setActiveTab(tabParam);
    } else {
      // Load default tab preference from storage
      chrome.storage.sync.get(['defaultTab'], (result) => {
        if (result.defaultTab && ['overview', 'tabs', 'groups', 'saved', 'analytics', 'settings'].includes(result.defaultTab)) {
          setActiveTab(result.defaultTab);
        }
      });
    }
  }, [activeTab]);
  
  const loadDashboardData = async () => {
    setLoading(true);
    
    try {
      // Get all tabs
      const allTabs = await new Promise(resolve => {
        chrome.tabs.query({}, (tabs) => resolve(tabs));
      });
      
      // Get all windows
      const allWindows = await new Promise(resolve => {
        chrome.windows.getAll({}, (windows) => resolve(windows));
      });
      
      // Get tab groups
      let groups = [];
      if (chrome.tabGroups) {
        groups = await new Promise(resolve => {
          chrome.tabGroups.query({}, (tabGroups) => resolve(tabGroups || []));
        });
      }
      
      // Get saved tab groups
      const [tabStorageModule] = await Promise.all([
        tabStorageImport
      ]);
      const savedTabGroups = await tabStorageModule.loadTabGroups();
      
      // Get activity data and usage statistics
      const [tabActivityModule] = await Promise.all([
        tabActivityImport
      ]);
      const activityData = await tabActivityModule.getTabActivityData();
      const usageStats = await tabActivityModule.getTabUsageStatistics();
      
      // Get cleanup suggestions - this now filters out already grouped tabs
      const [tabClassifierModule] = await Promise.all([
        tabClassifierImport
      ]);
      const cleanupSuggestions = await tabClassifierModule.suggestTabCleanup(allTabs, activityData);
      
      // Calculate tab age
      let oldestTabDate = Date.now();
      Object.values(activityData).forEach(data => {
        if (data.lastAccessed && data.lastAccessed < oldestTabDate) {
          oldestTabDate = data.lastAccessed;
        }
      });
      
      const oldestTabDays = Math.round((Date.now() - oldestTabDate) / (1000 * 60 * 60 * 24));
      
      // Update state
      setTabs(allTabs);
      setTabGroups(groups);
      setSavedGroups(savedTabGroups);
      setCleanupSuggestions(cleanupSuggestions.similarTabGroups || []);
      
      setStats({
        totalTabs: allTabs.length,
        totalWindows: allWindows.length,
        tabsPerWindow: allTabs.length / Math.max(allWindows.length, 1),
        oldestTab: oldestTabDays,
        savedGroups: savedTabGroups.length,
        ...usageStats
      });
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleRefresh = () => {
    loadDashboardData();
  };
  
  const handleOrganizeTabs = () => {
    chrome.runtime.sendMessage({ action: 'organizeTabs' }, (response) => {
      if (response && response.success) {
        loadDashboardData();
      }
    });
  };
  
  // Ensure all icons are loaded before switching tab
  const handleTabChange = (tabName) => {
    if (!additionalIcons && tabName !== 'overview') {
      // Load icons first
      loadAdditionalIcons().then(icons => {
        setAdditionalIcons(icons);
        setActiveTab(tabName);
      });
    } else {
      setActiveTab(tabName);
    }
  };
  
  const renderActiveTab = () => {
    // Create fallback for suspense
    const loadingFallback = <div className="loading-container">Loading...</div>;
    
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'tabs':
        return !additionalIcons ? loadingFallback : (
          <Suspense fallback={loadingFallback}>
            {renderAllTabs()}
          </Suspense>
        );
      case 'saved':
        return !additionalIcons ? loadingFallback : (
          <Suspense fallback={loadingFallback}>
            {renderSavedGroups()}
          </Suspense>
        );
      case 'groups':
        return !additionalIcons ? loadingFallback : (
          <Suspense fallback={loadingFallback}>
            {renderTabGroups()}
          </Suspense>
        );
      case 'analytics':
        return !additionalIcons ? loadingFallback : (
          <Suspense fallback={loadingFallback}>
            {renderAnalytics()}
          </Suspense>
        );
      case 'settings':
        return !additionalIcons ? loadingFallback : (
          <Suspense fallback={loadingFallback}>
            {renderSettings()}
          </Suspense>
        );
      default:
        return renderOverview();
    }
  };
  
  const renderOverview = () => (
    <>
      <div className="page-header">
        <h1 className="page-title">Dashboard Overview</h1>
        <button 
          className="btn btn-outline" 
          onClick={handleRefresh}
          style={{ display: 'flex', alignItems: 'center' }}
        >
          <FiRefreshCw className="btn-icon" /> Refresh
        </button>
      </div>
      
      <div className="dashboard-grid" style={{ marginBottom: '30px' }}>
        <Suspense fallback={<div>Loading stats...</div>}>
          <StatCard 
            title="Open Tabs"
            value={stats.totalTabs}
            icon={<FiTablet size={18} />}
            color="var(--primary)"
            description={`Across ${stats.totalWindows} windows`}
          />
          
          <StatCard 
            title="Tab Groups"
            value={tabGroups.length}
            icon={<FiLayers size={18} />}
            color="var(--secondary)"
            description="Active browser tab groups"
          />
          
          <StatCard 
            title="Saved Sessions"
            value={stats.savedGroups}
            icon={<FiSave size={18} />}
            color="var(--success)"
            description="Saved for later access"
          />
          
          <StatCard 
            title="Oldest Tab"
            value={`${stats.oldestTab} days`}
            icon={<FiClock size={18} />}
            color="var(--warning)"
            description="Since last accessed"
          />
        </Suspense>
      </div>
      
      {cleanupSuggestions.length > 0 && (
        <div className="card mt-4" style={{ marginTop: '30px' }}>
          <div className="card-header">
            <h2 className="card-title">Suggested Cleanup</h2>
            <button className="btn btn-primary" onClick={handleOrganizeTabs}>
              <FiCpu className="btn-icon" /> Organize Now
            </button>
          </div>
          
          <div>
            <Suspense fallback={<div>Loading suggestions...</div>}>
              {cleanupSuggestions.map(group => (
                <SuggestionCard 
                  key={group.id}
                  suggestion={{
                    type: 'cleanup',
                    message: `You have ${group.tabs.length} similar tabs from ${group.name}`,
                    action: 'Group These Tabs',
                    defaultGroupName: group.name
                  }}
                  onAction={(groupName) => {
                    // Use provided group name or fall back to original name
                    const finalGroupName = groupName || group.name;
                    
                    chrome.runtime.sendMessage({ 
                      action: 'createTabGroup', 
                      tabIds: group.tabs.map(tab => tab.id),
                      groupName: finalGroupName
                    }, (response) => {
                      if (response && response.success) {
                        // Remove this suggestion from the list
                        setCleanupSuggestions(
                          cleanupSuggestions.filter(item => item.id !== group.id)
                        );
                        
                        // Refresh data to show updated groups
                        loadDashboardData();
                      }
                    });
                  }}
                  onDismiss={() => {
                    // Remove this suggestion from the list
                    setCleanupSuggestions(
                      cleanupSuggestions.filter(item => item.id !== group.id)
                    );
                  }}
                />
              ))}
            </Suspense>
          </div>
        </div>
      )}
      
      <div className="card mt-4" style={{ marginTop: '30px' }}>
        <div className="card-header">
          <h2 className="card-title">Recent Tabs</h2>
          <a href="#" onClick={() => setActiveTab('tabs')}>View All</a>
        </div>
        
        <TabList 
          tabs={tabs.slice(0, 5)} 
          loading={loading}
          showFavIcon={true}
        />
      </div>
    </>
  );
  
  const renderAllTabs = () => (
    <>
      <div className="page-header">
        <h1 className="page-title">All Tabs</h1>
        <div>
          <button 
            className="btn btn-outline" 
            style={{ marginRight: '10px' }}
            onClick={() => {
              chrome.runtime.sendMessage({ action: 'saveTabs' }, () => {
                loadDashboardData();
              });
            }}
          >
            <FiSave className="btn-icon" /> Save All
          </button>
          
          <button 
            className="btn btn-primary"
            onClick={handleOrganizeTabs}
          >
            <FiCpu className="btn-icon" /> Organize
          </button>
        </div>
      </div>
      
      <div className="card">
        <TabList 
          tabs={tabs} 
          loading={loading}
          showFavIcon={true}
          onClose={() => loadDashboardData()}
        />
      </div>
    </>
  );
  
  const renderSavedGroups = () => (
    <>
      <div className="page-header">
        <h1 className="page-title">Saved Tab Groups</h1>
        <button 
          className="btn btn-outline" 
          onClick={() => {
            chrome.runtime.sendMessage({ action: 'saveTabs' }, () => {
              loadDashboardData();
            });
          }}
        >
          <FiSave className="btn-icon" /> Save All
        </button>
      </div>
      
      <SavedTabGroups 
        groups={savedGroups}
        loading={loading}
        onDelete={() => loadDashboardData()}
      />
    </>
  );
  
  const renderTabGroups = () => (
    <>
      <div className="page-header">
        <h1 className="page-title">Tab Group Management</h1>
      </div>
      
      <TabGroups onRefresh={loadDashboardData} />
    </>
  );
  
  const renderAnalytics = () => (
    <>
      <div className="page-header">
        <h1 className="page-title">Tab Analytics</h1>
      </div>
      
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Tab Usage Patterns</h2>
        </div>
        
        <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: '#6B7280' }}>
            Analytics visualization would go here in a production version.
            <br />
            This would show tab usage trends, patterns, and suggestions.
          </p>
        </div>
      </div>
    </>
  );
  
  const renderSettings = () => (
    <>
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
      </div>
      
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Preferences</h2>
        </div>
        
        <SettingsForm />
      </div>
    </>
  );
  
  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="sidebar-header">
          <FiCpu size={20} />
          <h1>AI Tab Manager</h1>
        </div>
        
        <ul className="nav-menu">
          <li 
            className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <FiGrid size={18} className="nav-item-icon" />
            Overview
          </li>
          
          <li 
            className={`nav-item ${activeTab === 'tabs' ? 'active' : ''}`}
            onClick={() => setActiveTab('tabs')}
          >
            <FiTablet size={18} className="nav-item-icon" />
            Current Tabs
          </li>
          
          <li 
            className={`nav-item ${activeTab === 'groups' ? 'active' : ''}`}
            onClick={() => setActiveTab('groups')}
          >
            <FiLayers size={18} className="nav-item-icon" />
            Tab Groups
          </li>
          
          <li 
            className={`nav-item ${activeTab === 'saved' ? 'active' : ''}`}
            onClick={() => setActiveTab('saved')}
          >
            <FiSave size={18} className="nav-item-icon" />
            Saved Groups
          </li>
          
          <li 
            className={`nav-item ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            <FiBarChart2 size={18} className="nav-item-icon" />
            Analytics
          </li>
          
          <li 
            className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <FiSettings size={18} className="nav-item-icon" />
            Settings
          </li>
        </ul>
      </aside>
      
      <main className="main-content">
        {renderActiveTab()}
      </main>
    </div>
  );
};

export default Dashboard; 