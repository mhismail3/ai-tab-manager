import React, { useState, useEffect, lazy, Suspense } from 'react';
// Import only the icons used in the overview tab initially
import { FiRefreshCw, FiCpu, FiTablet, FiLayers, FiSave, FiClock, FiGrid, FiBarChart2, FiSettings, FiKey } from 'react-icons/fi';

// Lazy load components
const StatCard = lazy(() => import('../components/StatCard'));
const TabList = lazy(() => import('../components/TabList'));
const SavedTabGroups = lazy(() => import('../components/SavedTabGroups'));
const SuggestionCard = lazy(() => import('../components/SuggestionCard'));
const SettingsForm = lazy(() => import('../components/SettingsForm'));
const TabGroups = lazy(() => import('../components/TabGroups'));
const Onboarding = lazy(() => import('../components/Onboarding'));

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
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  // Analytics state
  const [activeAnalyticsTab, setActiveAnalyticsTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('7days');
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [frequentTabs, setFrequentTabs] = useState([]);
  const [oldTabs, setOldTabs] = useState([]);
  
  // API Key state
  const [apiKey, setApiKey] = useState('');
  const [apiKeySaved, setApiKeySaved] = useState(false);
  
  useEffect(() => {
    // Check if this is the first time user is accessing the dashboard
    chrome.storage.local.get(['ai_tab_manager_onboarding_completed'], (result) => {
      setShowOnboarding(!result.ai_tab_manager_onboarding_completed);
    });
    
    // Load API key
    chrome.storage.sync.get(['huggingfaceApiKey'], (result) => {
      if (result.huggingfaceApiKey) {
        setApiKey(result.huggingfaceApiKey);
      }
    });
    
    // First load the dashboard data (do this immediately, don't wait for tab determination)
    console.log("Initial load - calling loadDashboardData");
    loadDashboardData().then(tabCount => {
      // If we got 0 tabs, which seems unlikely, try once more after a delay
      if (tabCount === 0) {
        console.log("Initial load returned 0 tabs, retrying after delay...");
        setTimeout(() => {
          loadDashboardData();
        }, 1000);
      }
    });
    
    // Then determine which tab to show
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    
    if (tabParam && ['overview', 'tabs', 'groups', 'saved', 'analytics', 'apikey', 'settings'].includes(tabParam)) {
      setActiveTab(tabParam);
    } else {
      // Load default tab preference from storage
      chrome.storage.sync.get(['defaultTab'], (result) => {
        if (result.defaultTab && ['overview', 'tabs', 'groups', 'saved', 'analytics', 'apikey', 'settings'].includes(result.defaultTab)) {
          setActiveTab(result.defaultTab);
        }
      });
    }
    
    // Load additional icons if not on overview tab
    if (activeTab !== 'overview' && !additionalIcons) {
      loadAdditionalIcons().then(setAdditionalIcons);
    }
  }, []); // Empty dependency array to only run on mount

  // Load analytics data when timeRange changes or analytics tab is active
  useEffect(() => {
    if (activeTab === 'analytics') {
      console.log("Analytics tab active, loading analytics data");
      loadAnalyticsData();
    }
  }, [timeRange, activeTab]);

  // Update URL when tab changes
  useEffect(() => {
    console.log(`Tab changed to: ${activeTab}`);
    
    // Update URL to reflect current tab without reloading the page
    const url = new URL(window.location.href);
    if (activeTab === 'overview') {
      url.searchParams.delete('tab');
    } else {
      url.searchParams.set('tab', activeTab);
    }
    window.history.replaceState({}, '', url.toString());
    
    // Always load fresh tab data when switching tabs
    // This ensures all tab counts are up-to-date across the entire dashboard
    console.log(`Reloading dashboard data because tab changed to: ${activeTab}`);
    loadDashboardData();
    
    // Load additional icons if needed
    if (activeTab !== 'overview' && !additionalIcons) {
      loadAdditionalIcons().then(setAdditionalIcons);
    }
  }, [activeTab]);
  
  const loadDashboardData = async () => {
    setLoading(true);
    
    try {
      // Get all tabs with a more robust error handling approach
      const allTabs = await new Promise(resolve => {
        chrome.tabs.query({}, (tabs) => {
          if (chrome.runtime.lastError) {
            console.error("Error querying tabs:", chrome.runtime.lastError);
            resolve([]);
            return;
          }
          
          console.log("Tab query returned:", tabs ? tabs.length : 0, "tabs");
          
          // If we got zero tabs but should have tabs, retry once after a short delay
          if (!tabs || tabs.length === 0) {
            console.warn("Got zero tabs, which seems incorrect. Retrying...");
            setTimeout(() => {
              chrome.tabs.query({}, (retryTabs) => {
                console.log("Retry tab query returned:", retryTabs ? retryTabs.length : 0, "tabs");
                resolve(retryTabs || []);
              });
            }, 500);
            return;
          }
          
          resolve(tabs || []);
        });
      });
      
      // Get all windows
      const allWindows = await new Promise(resolve => {
        chrome.windows.getAll({}, (windows) => resolve(windows || []));
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
      
      // Ensure totalTabs is correctly set using the allTabs array length
      const totalTabsCount = Array.isArray(allTabs) ? allTabs.length : 0;
      
      // Log the final tab count before updating state
      console.log("Setting tab count to:", totalTabsCount);
      
      setStats({
        totalTabs: totalTabsCount,
        totalWindows: allWindows.length || 0,
        tabsPerWindow: totalTabsCount / Math.max(allWindows.length || 1, 1),
        oldestTab: oldestTabDays || 0,
        savedGroups: savedTabGroups.length || 0,
        ...usageStats
      });
      
      console.log("Dashboard data loaded with", totalTabsCount, "tabs");
      
      return totalTabsCount;
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      return 0;
    } finally {
      setLoading(false);
    }
  };
  
  const handleRefresh = () => {
    console.log("Manual refresh requested");
    // First reset the stats to ensure a visual update even if the same values are loaded
    setStats({
      totalTabs: 0,
      totalWindows: 0,
      tabsPerWindow: 0,
      oldestTab: 0,
      savedGroups: 0
    });
    
    // Then load fresh data
    setTimeout(() => {
      loadDashboardData();
    }, 50);
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
      case 'apikey':
        return renderApiKey();
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
  
  const renderOverview = () => {
    console.log("Rendering Overview with stats:", stats);
    return (
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
  };
  
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
  
  const renderAnalytics = () => {
    // Create local ref to additionalIcons to avoid null checks everywhere
    const ActivityIcon = additionalIcons?.FiActivity || FiClock;
    
    return (
      <>
        <div className="page-header">
          <h1 className="page-title">Tab Analytics</h1>
          <div>
            <select 
              className="select-time-range" 
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
            >
              <option value="today">Today</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="all">All Time</option>
            </select>
            <button 
              className="btn btn-outline" 
              onClick={loadAnalyticsData}
              style={{ marginLeft: '10px' }}
            >
              <FiRefreshCw className="btn-icon" /> Refresh
            </button>
          </div>
        </div>
        
        <div className="analytics-tabs">
          <div 
            className={`analytics-tab ${activeAnalyticsTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveAnalyticsTab('overview')}
          >
            Overview
          </div>
          <div 
            className={`analytics-tab ${activeAnalyticsTab === 'frequent' ? 'active' : ''}`}
            onClick={() => setActiveAnalyticsTab('frequent')}
          >
            Most Used Tabs
          </div>
          <div 
            className={`analytics-tab ${activeAnalyticsTab === 'old' ? 'active' : ''}`}
            onClick={() => setActiveAnalyticsTab('old')}
          >
            Oldest Tabs
          </div>
        </div>
        
        {activeAnalyticsTab === 'overview' && (
          <div className="statistics-grid">
            <Suspense fallback={<div className="loading">Loading stats...</div>}>
              <StatCard 
                title="Total Tabs"
                value={stats.totalTabs}
                icon={<FiTablet />}
                color="#4A6CF7"
                description="Total open tabs across all windows"
              />
              
              <StatCard 
                title="Total Accesses"
                value={stats.totalAccesses || 0}
                icon={<ActivityIcon />}
                color="#10B981"
                description="Number of tab switches tracked"
              />
              
              <StatCard 
                title="Tabs Per Window"
                value={stats.tabsPerWindow ? stats.tabsPerWindow.toFixed(1) : 0}
                icon={<FiGrid />}
                color="#F59E0B"
                description="Average tabs open in each window"
              />
              
              <StatCard 
                title="Oldest Tab Age"
                value={`${stats.oldestTab || 0} days`}
                icon={<FiClock />}
                color="#EF4444"
                description="Age of the oldest tab still open"
              />
            </Suspense>
          </div>
        )}
        
        {activeAnalyticsTab === 'frequent' && (
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Most Frequently Used Tabs</h2>
            </div>
            
            {loadingAnalytics ? (
              <div className="loading-container">Loading tab data...</div>
            ) : (
              <div className="tab-analytics-list">
                {frequentTabs.length === 0 ? (
                  <div className="empty-state">
                    <p>No tab access data available yet.</p>
                    <p>Use your browser normally and check back later!</p>
                  </div>
                ) : (
                  <table className="analytics-table">
                    <thead>
                      <tr>
                        <th>Tab</th>
                        <th>Access Count</th>
                        <th>Last Accessed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {frequentTabs.map((item) => (
                        <tr key={item.tabId} onClick={() => {
                          chrome.tabs.update(item.tabId, { active: true });
                        }}>
                          <td>
                            <div className="tab-with-favicon">
                              {item.tab.favIconUrl && (
                                <img 
                                  src={item.tab.favIconUrl} 
                                  alt="" 
                                  className="tab-favicon"
                                  onError={(e) => e.target.style.display = 'none'}
                                />
                              )}
                              <span className="tab-title">{item.tab.title}</span>
                            </div>
                          </td>
                          <td>{item.accessCount || 0}</td>
                          <td>{formatTimeSince(item.lastAccessed)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        )}
        
        {activeAnalyticsTab === 'old' && (
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Least Recently Used Tabs</h2>
              <button 
                className="btn btn-outline btn-small"
                onClick={() => {
                  if (oldTabs.length > 0 && window.confirm(`Close ${oldTabs.length} old tabs?`)) {
                    oldTabs.forEach(item => {
                      if (item.tab) {
                        chrome.tabs.remove(item.tabId);
                      }
                    });
                    loadDashboardData();
                    setOldTabs([]);
                  }
                }}
              >
                Close All Old Tabs
              </button>
            </div>
            
            {loadingAnalytics ? (
              <div className="loading-container">Loading tab data...</div>
            ) : (
              <div className="tab-analytics-list">
                {oldTabs.length === 0 ? (
                  <div className="empty-state">
                    <p>No tab access data available yet.</p>
                    <p>Use your browser normally and check back later!</p>
                  </div>
                ) : (
                  <table className="analytics-table">
                    <thead>
                      <tr>
                        <th>Tab</th>
                        <th>Last Accessed</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {oldTabs.map((item) => (
                        <tr key={item.tabId}>
                          <td>
                            <div className="tab-with-favicon">
                              {item.tab.favIconUrl && (
                                <img 
                                  src={item.tab.favIconUrl} 
                                  alt="" 
                                  className="tab-favicon"
                                  onError={(e) => e.target.style.display = 'none'}
                                />
                              )}
                              <span className="tab-title">{item.tab.title}</span>
                            </div>
                          </td>
                          <td>{formatTimeSince(item.lastAccessed)}</td>
                          <td>
                            <div className="tab-actions">
                              <button 
                                className="tab-action-btn view"
                                onClick={() => chrome.tabs.update(item.tabId, { active: true })}
                              >
                                View
                              </button>
                              <button 
                                className="tab-action-btn close"
                                onClick={() => {
                                  chrome.tabs.remove(item.tabId);
                                  setOldTabs(oldTabs.filter(t => t.tabId !== item.tabId));
                                }}
                              >
                                Close
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        )}
      </>
    );
  };
  
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
  
  const renderApiKey = () => {
    const handleSaveApiKey = () => {
      chrome.storage.sync.set({
        huggingfaceApiKey: apiKey
      }, () => {
        setApiKeySaved(true);
        setTimeout(() => setApiKeySaved(false), 2000);
      });
    };

    return (
      <>
        <div className="page-header">
          <h1 className="page-title">API Configuration</h1>
        </div>
        
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">AI Classification Settings</h2>
            <p className="card-description">
              Configure your AI model settings for intelligent tab classification
            </p>
          </div>
          
          <div className="card-content">
            <div className="form-group">
              <label className="form-label">
                HuggingFace API Key (Optional)
                <span className="form-hint">
                  Adding an API key increases rate limits for AI-powered tab classification
                </span>
              </label>
              <input
                type="password"
                className="form-input"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="hf_..."
                style={{ fontFamily: 'monospace' }}
              />
            </div>
            
            <div className="form-info">
              <div className="info-box">
                <h4>How it works:</h4>
                <ul>
                  <li>✅ <strong>With API Key:</strong> AI-powered classification with higher rate limits</li>
                  <li>🔄 <strong>Without API Key:</strong> Automatic fallback to keyword-based classification</li>
                  <li>🔒 <strong>Privacy:</strong> Only tab titles and URLs are sent to the API</li>
                </ul>
              </div>
              
              <div className="info-box">
                <h4>Get your free API key:</h4>
                <p>
                  Visit{' '}
                  <a
                    href="https://huggingface.co/settings/tokens"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link"
                  >
                    HuggingFace Settings
                  </a>
                  {' '}to create a free API token
                </p>
              </div>
            </div>
            
            <div className="form-actions">
              <button
                onClick={handleSaveApiKey}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <FiSave size={16} />
                Save API Key
              </button>
              {apiKeySaved && (
                <span className="success-message">API key saved successfully!</span>
              )}
            </div>
          </div>
        </div>
      </>
    );
  };
  
  const loadAnalyticsData = async () => {
    setLoadingAnalytics(true);
    try {
      console.log("Loading analytics data");
      
      // First load the dashboard data to ensure all stats are updated consistently
      await loadDashboardData();
      
      const [tabActivityModule] = await Promise.all([tabActivityImport]);
      
      // Get most frequently accessed tabs
      const frequent = await tabActivityModule.getMostFrequentTabs(10);
      
      // Get tabs that haven't been accessed in a while
      const oldTabs = await tabActivityModule.getLeastRecentTabs(10);
      
      // Make sure we have tabs data available
      if (!tabs || tabs.length === 0) {
        console.warn("Tab data not available for analytics, fetching again");
        // Fetch tabs directly if not available from the dashboard data
        const freshTabs = await new Promise(resolve => {
          chrome.tabs.query({}, (tabs) => {
            console.log("Fresh tabs query for analytics returned:", tabs ? tabs.length : 0, "tabs");
            resolve(tabs || []);
          });
        });
        
        if (freshTabs && freshTabs.length > 0) {
          setTabs(freshTabs); // Update the tabs state
        } else {
          console.error("Failed to get tabs for analytics");
        }
      }
      
      // Get additional tab information for the tabs loaded in the dashboard data
      console.log(`Using ${tabs.length} tabs for analytics tab details`);
      const tabMap = tabs.reduce((acc, tab) => {
        acc[tab.id] = tab;
        return acc;
      }, {});
      
      const frequentWithDetails = await Promise.all(
        frequent.map(async (item) => {
          const tab = tabMap[item.tabId];
          return { ...item, tab };
        })
      );
      
      const oldWithDetails = await Promise.all(
        oldTabs.map(async (item) => {
          const tab = tabMap[item.tabId];
          return { ...item, tab };
        })
      );
      
      setFrequentTabs(frequentWithDetails.filter(item => item.tab));
      setOldTabs(oldWithDetails.filter(item => item.tab));
      
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setLoadingAnalytics(false);
    }
  };
  
  const formatTime = (timestamp) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };
  
  const formatTimeSince = (timestamp) => {
    if (!timestamp) return 'Never accessed';
    
    const now = Date.now();
    const diff = now - timestamp;
    
    // Convert to days/hours/minutes
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    }
  };
  
  return (
    <div className="dashboard">
      {showOnboarding && (
        <Suspense fallback={<div>Loading onboarding...</div>}>
          <Onboarding onClose={() => setShowOnboarding(false)} />
        </Suspense>
      )}
      
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
            className={`nav-item ${activeTab === 'apikey' ? 'active' : ''}`}
            onClick={() => setActiveTab('apikey')}
          >
            <FiKey size={18} className="nav-item-icon" />
            API Key
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