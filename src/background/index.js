import { analyzeTabContent, classifyTabs, suggestTabCleanup } from '../models/tabClassifier';
import { saveTabGroup, loadTabGroups, getSimilarTabs } from '../models/tabStorage';
import { getTabActivityData } from '../models/tabActivity';

// Define constants
const IDLE_TAB_DAYS = 7; // Number of days before a tab is considered idle
const AUTO_SUGGEST_INTERVAL = 1000 * 60 * 60; // Check every hour
const MAX_HISTORY_ITEMS = 100; // Store up to 100 tab URLs in history

// Initialize state
let state = {
  tabGroups: {},
  tabMetadata: {},
  tabHistory: [],
  settings: {
    autoOrganize: false,
    suggestCleanup: true,
    cleanupThreshold: 10, // Suggest cleanup when 10+ tabs are open
    useAI: true,
    syncEnabled: false,
    syncInterval: 60 // Sync every 60 minutes
  }
};

// Load settings on startup
const loadSettings = async () => {
  try {
    const data = await new Promise(resolve => {
      chrome.storage.sync.get('settings', (result) => {
        resolve(result.settings);
      });
    });
    
    if (data) {
      state.settings = { ...state.settings, ...data };
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }
};

// Save settings
const saveSettings = async (settings) => {
  state.settings = { ...state.settings, ...settings };
  await chrome.storage.sync.set({ settings: state.settings });
};

// Load tab metadata from storage
const loadTabMetadata = async () => {
  try {
    const data = await new Promise(resolve => {
      chrome.storage.local.get('tabMetadata', (result) => {
        resolve(result.tabMetadata);
      });
    });
    
    if (data) {
      state.tabMetadata = data;
    }
  } catch (error) {
    console.error('Error loading tab metadata:', error);
  }
};

// Organize tabs into groups based on content similarity
const organizeTabs = async () => {
  console.log('Starting tab organization...');
  
  // Get all tabs
  const tabs = await new Promise(resolve => {
    chrome.tabs.query({}, (tabs) => resolve(tabs));
  });
  
  if (!tabs || tabs.length < 2) {
    console.log('Not enough tabs to organize');
    return;
  }
  
  // If we're using AI classification
  if (state.settings.useAI) {
    // This is a placeholder for AI-based tab classification
    // In a real implementation, this would use a machine learning model
    const tabGroups = await classifyTabs(tabs);
    
    // Create tab groups in Chrome
    Object.entries(tabGroups).forEach(async ([groupName, groupTabs]) => {
      if (groupTabs.length > 1) {
        const tabIds = groupTabs.map(tab => tab.id);
        
        // Create a new tab group
        const groupId = await new Promise(resolve => {
          chrome.tabs.group({ tabIds }, (groupId) => resolve(groupId));
        });
        
        // Set the group title
        chrome.tabGroups.update(groupId, { title: groupName });
      }
    });
  } else {
    // Simple domain-based grouping as fallback
    const domains = {};
    
    tabs.forEach(tab => {
      try {
        const url = new URL(tab.url);
        const domain = url.hostname;
        
        if (!domains[domain]) {
          domains[domain] = [];
        }
        
        domains[domain].push(tab.id);
      } catch (error) {
        console.warn('Invalid URL:', tab.url);
      }
    });
    
    // Create tab groups for domains with multiple tabs
    Object.entries(domains).forEach(async ([domain, tabIds]) => {
      if (tabIds.length > 1) {
        const groupId = await new Promise(resolve => {
          chrome.tabs.group({ tabIds }, (groupId) => resolve(groupId));
        });
        
        // Extract domain name for group title
        let title = domain.replace('www.', '');
        if (title.includes('.')) {
          title = title.split('.')[0];
        }
        
        // Capitalize first letter
        title = title.charAt(0).toUpperCase() + title.slice(1);
        
        chrome.tabGroups.update(groupId, { title });
      }
    });
  }
  
  console.log('Tab organization complete');
  return { success: true };
};

// Save all current tabs to a named group
const saveTabs = async () => {
  // Get current tabs
  const tabs = await new Promise(resolve => {
    chrome.tabs.query({}, (tabs) => resolve(tabs));
  });
  
  // Create a timestamp-based name
  const timestamp = new Date().toLocaleString();
  const groupName = `Saved Tabs - ${timestamp}`;
  
  // Format tabs for storage
  const tabData = tabs.map(tab => ({
    url: tab.url,
    title: tab.title,
    favIconUrl: tab.favIconUrl || '',
    savedAt: Date.now()
  }));
  
  // Save to storage
  await saveTabGroup(groupName, tabData);
  
  return { success: true, message: `Saved ${tabs.length} tabs to "${groupName}"` };
};

// Archive selected tabs - save them and close them
const archiveTabs = async (tabIds) => {
  if (!tabIds || tabIds.length === 0) {
    // If no specific tabs were provided, use the current active tab
    const tabs = await new Promise(resolve => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => resolve(tabs));
    });
    
    tabIds = tabs.map(tab => tab.id);
  }
  
  // Get tab details before closing
  const tabDetails = await Promise.all(tabIds.map(tabId => {
    return new Promise(resolve => {
      chrome.tabs.get(tabId, (tab) => resolve(tab));
    });
  }));
  
  // Create a timestamp-based name
  const timestamp = new Date().toLocaleString();
  const groupName = `Archived - ${timestamp}`;
  
  // Format tabs for storage
  const tabData = tabDetails.map(tab => ({
    url: tab.url,
    title: tab.title,
    favIconUrl: tab.favIconUrl || '',
    archivedAt: Date.now()
  }));
  
  // Save to storage
  await saveTabGroup(groupName, tabData);
  
  // Close the tabs
  chrome.tabs.remove(tabIds);
  
  return { success: true, message: `Archived ${tabIds.length} tabs to "${groupName}"` };
};

// Check for idle tabs and suggest cleanup
const checkForIdleTabs = async () => {
  // Get all tabs
  const tabs = await new Promise(resolve => {
    chrome.tabs.query({}, (tabs) => resolve(tabs));
  });
  
  // Get activity data
  const activityData = await getTabActivityData();
  
  // Calculate idle tabs
  const now = Date.now();
  const idleTabs = tabs.filter(tab => {
    const tabActivity = activityData[tab.id];
    if (!tabActivity || !tabActivity.lastAccessed) return false;
    
    const daysSinceAccessed = (now - tabActivity.lastAccessed) / (1000 * 60 * 60 * 24);
    return daysSinceAccessed > IDLE_TAB_DAYS;
  });
  
  if (idleTabs.length > 0) {
    // Show notification for idle tabs
    chrome.notifications.create('idle-tabs-notification', {
      type: 'basic',
      iconUrl: '/icons/icon128.png',
      title: 'Tab Cleanup Suggestion',
      message: `You have ${idleTabs.length} tabs that haven't been used in over a week. Would you like to archive them?`,
      buttons: [
        { title: 'Archive Now' },
        { title: 'Dismiss' }
      ]
    });
  }
  
  return idleTabs;
};

// Natural language search for tabs
const naturalLanguageSearch = async (query) => {
  // Get all tabs
  const tabs = await new Promise(resolve => {
    chrome.tabs.query({}, (tabs) => resolve(tabs));
  });
  
  // In a real implementation, this would use a semantic search algorithm,
  // possibly with a local TensorFlow.js model or an external API call.
  // For this demo, we'll do a simple keyword search on the title and URL.
  
  const keywords = query.toLowerCase().split(/\s+/);
  
  const results = tabs.map(tab => {
    const title = tab.title.toLowerCase();
    const url = tab.url.toLowerCase();
    
    // Calculate a simple relevance score
    let score = 0;
    keywords.forEach(keyword => {
      if (title.includes(keyword)) score += 2;
      if (url.includes(keyword)) score += 1;
    });
    
    return {
      tab,
      score
    };
  });
  
  // Sort by score and return tabs
  return results
    .filter(result => result.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(result => result.tab);
};

// Track tab activity
const trackTabActivity = (tabId, windowId) => {
  if (!state.tabMetadata[tabId]) {
    state.tabMetadata[tabId] = {};
  }
  
  state.tabMetadata[tabId].lastAccessed = Date.now();
  state.tabMetadata[tabId].windowId = windowId;
  
  // Persist to storage
  chrome.storage.local.set({ tabMetadata: state.tabMetadata });
};

// Handle incoming extension messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    let response = { success: false };
    
    switch (request.action) {
      case 'organizeTabs':
        response = await organizeTabs();
        break;
      
      case 'saveTabs':
        response = await saveTabs();
        break;
        
      case 'archiveTabs':
        response = await archiveTabs(request.tabIds);
        break;
        
      case 'updateSettings':
        await saveSettings(request.settings);
        response = { success: true, settings: state.settings };
        break;
        
      case 'getSettings':
        response = { success: true, settings: state.settings };
        break;
        
      case 'naturalLanguageSearch':
        const results = await naturalLanguageSearch(request.query);
        response = { success: true, results };
        break;
      
      case 'createNewGroup':
        // Get all active tabs
        const tabs = await new Promise(resolve => {
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => resolve(tabs));
        });
        
        if (tabs.length > 0) {
          // Create a new group with the active tab
          const groupId = await new Promise(resolve => {
            chrome.tabs.group({ tabIds: [tabs[0].id] }, (groupId) => resolve(groupId));
          });
          
          chrome.tabGroups.update(groupId, { title: 'New Group' });
          response = { success: true, groupId };
        }
        break;
        
      default:
        response = { success: false, error: 'Unknown action' };
    }
    
    sendResponse(response);
  })();
  
  // Return true to indicate we will send a response asynchronously
  return true;
});

// Listen for tab activation and track it
chrome.tabs.onActivated.addListener((activeInfo) => {
  trackTabActivity(activeInfo.tabId, activeInfo.windowId);
  
  // Add to tab history for better suggestions
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (tab && tab.url) {
      state.tabHistory.unshift({ 
        url: tab.url, 
        title: tab.title, 
        timestamp: Date.now() 
      });
      
      // Limit history size
      if (state.tabHistory.length > MAX_HISTORY_ITEMS) {
        state.tabHistory = state.tabHistory.slice(0, MAX_HISTORY_ITEMS);
      }
      
      // Persist history
      chrome.storage.local.set({ tabHistory: state.tabHistory });
    }
  });
});

// Check for tab cleanup periodically
if (AUTO_SUGGEST_INTERVAL > 0) {
  setInterval(async () => {
    if (state.settings.suggestCleanup) {
      // Check tab count first
      const tabs = await new Promise(resolve => {
        chrome.tabs.query({}, (tabs) => resolve(tabs));
      });
      
      if (tabs.length >= state.settings.cleanupThreshold) {
        await checkForIdleTabs();
      }
    }
  }, AUTO_SUGGEST_INTERVAL);
}

// Handle notification button clicks
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  if (notificationId === 'idle-tabs-notification') {
    if (buttonIndex === 0) { // Archive Now was clicked
      checkForIdleTabs().then(idleTabs => {
        const idleTabIds = idleTabs.map(tab => tab.id);
        archiveTabs(idleTabIds);
      });
    }
  }
});

// Initialize on startup
const init = async () => {
  await loadSettings();
  await loadTabMetadata();
  
  // Sync tab metadata for closed tabs
  chrome.tabs.query({}, (tabs) => {
    const currentTabIds = new Set(tabs.map(tab => tab.id));
    const storedTabIds = Object.keys(state.tabMetadata).map(Number);
    
    // Remove metadata for tabs that no longer exist
    storedTabIds.forEach(tabId => {
      if (!currentTabIds.has(tabId)) {
        delete state.tabMetadata[tabId];
      }
    });
    
    // Save the cleaned metadata
    chrome.storage.local.set({ tabMetadata: state.tabMetadata });
  });
};

// Call initialization
init(); 