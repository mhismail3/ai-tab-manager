import { analyzeTabContent, classifyTabs, suggestTabCleanup } from '../models/tabClassifier';
import { saveTabGroup, loadTabGroups, getSimilarTabs } from '../models/tabStorage';
import { getTabActivityData } from '../models/tabActivity';

// Define constants
const IDLE_TAB_DAYS = 7; // Number of days before a tab is considered idle
const AUTO_SUGGEST_INTERVAL = 1000 * 60 * 60; // Check every hour
const MAX_HISTORY_ITEMS = 100; // Store up to 100 tab URLs in history
const TAB_LIMIT_CHECK_INTERVAL = 1000 * 5; // Check tab limit every 5 seconds

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
    syncInterval: 60, // Sync every 60 minutes
    tabLimit: 10, // Default max number of tabs
    closeStrategy: 'oldest', // Default tab closing strategy
    notifyTabLimit: true // Default notification setting
  },
  lastTabLimitNotification: 0 // Timestamp of last notification to prevent spam
};

// Load settings on startup
const loadSettings = async () => {
  try {
    const data = await new Promise(resolve => {
      chrome.storage.sync.get([
        'settings', 
        'tabLimit', 
        'closeStrategy', 
        'notifyTabLimit'
      ], (result) => {
        resolve(result);
      });
    });
    
    if (data.settings) {
      state.settings = { ...state.settings, ...data.settings };
    }
    
    // For backward compatibility, also check individual settings
    if (data.tabLimit) {
      state.settings.tabLimit = data.tabLimit;
    }
    
    if (data.closeStrategy) {
      state.settings.closeStrategy = data.closeStrategy;
    }
    
    if (data.notifyTabLimit !== undefined) {
      state.settings.notifyTabLimit = data.notifyTabLimit;
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }
};

// Save settings to storage and update state
const saveSettings = async (settings) => {
  state.settings = { ...state.settings, ...settings };
  await chrome.storage.sync.set({ settings: state.settings });
  return state.settings;
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
const organizeTabs = async (options = {}) => {
  console.log('Starting tab organization...');
  
  // Get all tabs
  const tabs = await new Promise(resolve => {
    chrome.tabs.query({}, (tabs) => resolve(tabs));
  });
  
  if (!tabs || tabs.length < 2) {
    console.log('Not enough tabs to organize');
    return { success: false, error: 'Not enough tabs to organize' };
  }
  
  // Filter out tabs that are already in groups if ungroupedOnly is specified
  const tabsToOrganize = options.ungroupedOnly 
    ? tabs.filter(tab => tab.groupId === undefined || tab.groupId === -1)
    : tabs;
  
  // Check if we have enough tabs to organize after filtering
  if (tabsToOrganize.length < 2) {
    console.log('Not enough ungrouped tabs to organize');
    return { success: false, error: 'Not enough ungrouped tabs to organize' };
  }
  
  // Instead of just checking if chrome.tabGroups exists, check if the required methods are available
  const hasTabGroupsSupport = typeof chrome.tabs.group === 'function' && 
                              typeof chrome.tabGroups?.update === 'function';
  
  if (!hasTabGroupsSupport) {
    console.warn('Tab Groups API not fully available, using fallback method');
    
    try {
      // Fallback: Save tabs instead of grouping them
      const timestamp = new Date().toLocaleString();
      const groupName = `Auto-Organized - ${timestamp}`;
      
      // Format tabs for storage
      const tabData = tabsToOrganize.map(tab => ({
        url: tab.url,
        title: tab.title,
        favIconUrl: tab.favIconUrl || '',
        savedAt: Date.now()
      }));
      
      // Save to storage
      await saveTabGroup(groupName, tabData);
      
      return { 
        success: true, 
        fallback: true,
        message: `Tab Groups API not available, but ${tabsToOrganize.length} tabs were saved to "${groupName}" for reference.`
      };
    } catch (fallbackError) {
      console.error('Error in fallback tab saving:', fallbackError);
      return { 
        success: false, 
        error: 'Could not organize tabs. Your browser may not support tab groups. Check you are using Chrome version 89 or newer.'
      };
    }
  }
  
  try {
    // If we're using AI classification
    if (state.settings.useAI) {
      // This is a placeholder for AI-based tab classification
      // In a real implementation, this would use a machine learning model
      const tabGroups = await classifyTabs(tabsToOrganize);
      
      // Create tab groups in Chrome
      for (const [groupName, groupTabs] of Object.entries(tabGroups)) {
        if (groupTabs.length > 1) {
          try {
            const tabIds = groupTabs.map(tab => tab.id);
            
            // Create a new tab group with error handling
            let groupId;
            try {
              groupId = await new Promise((resolve, reject) => {
                chrome.tabs.group({ tabIds }, (groupId) => {
                  if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                  } else {
                    resolve(groupId);
                  }
                });
              });
            } catch (groupError) {
              console.error('Error creating tab group:', groupError);
              continue; // Skip to next group instead of failing completely
            }
            
            // Set the group title
            if (groupId !== undefined) {
              try {
                await new Promise(resolve => {
                  chrome.tabGroups.update(groupId, { title: groupName }, () => {
                    if (chrome.runtime.lastError) {
                      console.warn('Failed to set group name:', chrome.runtime.lastError);
                    }
                    resolve();
                  });
                });
              } catch (titleError) {
                console.warn('Error setting group title:', titleError);
                // Continue even if title setting fails
              }
            }
          } catch (err) {
            console.error('Error creating tab group for', groupName, err);
            // Continue with other groups even if one fails
          }
        }
      }
    } else {
      // Simple domain-based grouping as fallback
      const domains = {};
      
      tabsToOrganize.forEach(tab => {
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
      for (const [domain, tabIds] of Object.entries(domains)) {
        if (tabIds.length > 1) {
          try {
            let groupId;
            try {
              groupId = await new Promise((resolve, reject) => {
                chrome.tabs.group({ tabIds }, (groupId) => {
                  if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                  } else {
                    resolve(groupId);
                  }
                });
              });
            } catch (groupError) {
              console.error('Error creating tab group:', groupError);
              continue; // Skip to next group instead of failing completely
            }
            
            if (groupId !== undefined) {
              // Extract domain name for group title
              let title = domain.replace('www.', '');
              if (title.includes('.')) {
                title = title.split('.')[0];
              }
              
              // Capitalize first letter
              title = title.charAt(0).toUpperCase() + title.slice(1);
              
              try {
                await new Promise(resolve => {
                  chrome.tabGroups.update(groupId, { title }, () => {
                    if (chrome.runtime.lastError) {
                      console.warn('Failed to set group name:', chrome.runtime.lastError);
                    }
                    resolve();
                  });
                });
              } catch (titleError) {
                console.warn('Error setting group title:', titleError);
                // Continue even if title setting fails
              }
            }
          } catch (error) {
            console.error('Error creating tab group for', domain, error);
            // Continue with other groups even if one fails
          }
        }
      }
    }
    
    return { success: true, message: `Organized ${tabsToOrganize.length} tabs into groups!` };
  } catch (error) {
    console.error('Error organizing tabs:', error);
    return { success: false, error: error.message || 'Failed to organize tabs' };
  }
};

// Save all current tabs to a named group
const saveTabs = async (customName) => {
  // Get current tabs
  const tabs = await new Promise(resolve => {
    chrome.tabs.query({}, (tabs) => resolve(tabs));
  });
  
  // Create a name based on custom input or timestamp
  const timestamp = new Date().toLocaleString();
  const groupName = customName || `Saved Tabs - ${timestamp}`;
  
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

// Create a new tab group with specified tabs
const createTabGroup = async (tabIds, groupName) => {
  if (!tabIds || tabIds.length === 0) {
    return { success: false, error: 'No tabs specified' };
  }
  
  try {
    // Check if the tab groups API is available
    if (!chrome.tabGroups) {
      console.warn('Tab Groups API is not available in this browser');
      return { 
        success: false, 
        error: 'Tab Groups API is not available in this browser. Try using Chrome version 89 or newer.'
      };
    }
    
    // Create a new tab group with the specified tabs
    const groupId = await new Promise((resolve, reject) => {
      try {
        chrome.tabs.group({ tabIds }, (groupId) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(groupId);
          }
        });
      } catch (err) {
        reject(err);
      }
    });
    
    // Set the group name if groupId was returned successfully
    if (groupId !== undefined) {
      try {
        await new Promise((resolve, reject) => {
          chrome.tabGroups.update(groupId, { title: groupName || 'New Group' }, () => {
            if (chrome.runtime.lastError) {
              // If updating the name fails, we still created the group successfully
              console.warn('Failed to set group name:', chrome.runtime.lastError);
              resolve();
            } else {
              resolve();
            }
          });
        });
      } catch (nameError) {
        // If setting the name fails, log it but don't consider the whole operation failed
        console.warn('Error setting group name:', nameError);
      }
    }
    
    return { success: true, groupId };
  } catch (error) {
    console.error('Error creating tab group:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to create tab group'
    };
  }
};

// Background script message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    let response = { success: false };
    
    switch (request.action) {
      case 'organizeTabs':
        response = await organizeTabs({ ungroupedOnly: request.ungroupedOnly });
        if (response.fallback && response.success) {
          // If we used the fallback method, include a message to show the user
          response.message = response.message || "Tabs organized successfully using alternative method. Your tabs were saved for reference.";
        }
        break;
      
      case 'saveTabs':
        response = await saveTabs(request.groupName);
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
      
      // For backward compatibility - individual settings updates
      case 'updateTabLimit':
        state.settings.tabLimit = request.tabLimit;
        await chrome.storage.sync.set({ 
          tabLimit: request.tabLimit,
          settings: state.settings 
        });
        response = { success: true, tabLimit: request.tabLimit };
        break;
        
      case 'updateCloseStrategy':
        state.settings.closeStrategy = request.closeStrategy;
        await chrome.storage.sync.set({ 
          closeStrategy: request.closeStrategy,
          settings: state.settings 
        });
        response = { success: true, closeStrategy: request.closeStrategy };
        break;
        
      case 'updateNotifyTabLimit':
        state.settings.notifyTabLimit = request.notifyTabLimit;
        await chrome.storage.sync.set({ 
          notifyTabLimit: request.notifyTabLimit,
          settings: state.settings 
        });
        response = { success: true, notifyTabLimit: request.notifyTabLimit };
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
          try {
            // Check if the tab groups API is available
            const hasTabGroupsSupport = typeof chrome.tabs.group === 'function' && 
                                       typeof chrome.tabGroups?.update === 'function';
            
            if (!hasTabGroupsSupport) {
              // Use fallback method - save the tab instead
              const timestamp = new Date().toLocaleString();
              const groupName = `New Group - ${timestamp}`;
              
              // Format tabs for storage
              const tabData = tabs.map(tab => ({
                url: tab.url,
                title: tab.title,
                favIconUrl: tab.favIconUrl || '',
                savedAt: Date.now()
              }));
              
              // Save to storage
              await saveTabGroup(groupName, tabData);
              
              response = { 
                success: true, 
                fallback: true,
                message: `Tab Groups API not available, but the tab was saved to "${groupName}" for reference.`
              };
              break;
            }
          
            // Create a new group with the active tab
            const groupId = await new Promise((resolve, reject) => {
              try {
                chrome.tabs.group({ tabIds: [tabs[0].id] }, (groupId) => {
                  if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                  } else {
                    resolve(groupId);
                  }
                });
              } catch (err) {
                reject(err);
              }
            });
            
            // Set the group name if groupId was returned successfully
            if (groupId !== undefined) {
              try {
                await new Promise((resolve) => {
                  chrome.tabGroups.update(groupId, { title: 'New Group' }, () => {
                    if (chrome.runtime.lastError) {
                      console.warn('Failed to set group name:', chrome.runtime.lastError);
                    }
                    resolve();
                  });
                });
              } catch (nameError) {
                console.warn('Error setting group name:', nameError);
              }
            }
            
            response = { success: true, groupId };
          } catch (error) {
            console.error('Error creating new group:', error);
            response = { 
              success: false, 
              error: error.message || 'Failed to create new group'
            };
          }
        } else {
          response = { 
            success: false, 
            error: 'No active tab found'
          };
        }
        break;
        
      case 'createTabGroup':
        response = await createTabGroup(request.tabIds, request.groupName);
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
  } else if (notificationId === 'tab-limit-notification') {
    if (buttonIndex === 0) { // Close Tabs was clicked
      handleTabLimitAction();
    }
  }
});

// Check if tab count exceeds limit and handle accordingly
const checkTabLimit = async () => {
  try {
    // Get all tabs
    const tabs = await new Promise(resolve => {
      chrome.tabs.query({}, tabs => resolve(tabs));
    });
    
    // If tab count is less than limit, do nothing
    if (tabs.length <= state.settings.tabLimit) {
      return;
    }
    
    console.log(`Tab limit exceeded: ${tabs.length} tabs open, limit is ${state.settings.tabLimit}`);
    
    // If notification is enabled, show a notification
    if (state.settings.notifyTabLimit) {
      // Don't spam notifications - only show one per minute
      const now = Date.now();
      if (now - state.lastTabLimitNotification > 60000) {
        state.lastTabLimitNotification = now;
        
        chrome.notifications.create('tab-limit-notification', {
          type: 'basic',
          iconUrl: 'icons/icon128.png',
          title: 'Tab Limit Reached',
          message: `You have ${tabs.length} tabs open, exceeding your limit of ${state.settings.tabLimit}.`,
          buttons: [
            { title: 'Close Tabs' },
            { title: 'Dismiss' }
          ],
          priority: 2
        });
      }
    }
    
    // If auto-close is needed in the future, this is where it would go
  } catch (error) {
    console.error('Error checking tab limit:', error);
  }
};

// Close tabs based on the selected strategy
const handleTabLimitAction = async () => {
  try {
    // Get all tabs
    const tabs = await new Promise(resolve => {
      chrome.tabs.query({}, tabs => resolve(tabs));
    });
    
    // Calculate how many tabs to close
    const tabsToCloseCount = Math.max(0, tabs.length - state.settings.tabLimit);
    
    if (tabsToCloseCount <= 0) {
      return;
    }
    
    let tabsToClose = [];
    
    // Select tabs to close based on the strategy
    if (state.settings.closeStrategy === 'oldest') {
      // Get activity data to find oldest tabs
      const activityData = await getTabActivityData();
      
      // Sort tabs by last accessed time (oldest first)
      const tabsWithActivity = tabs.map(tab => ({
        tab,
        lastAccessed: activityData[tab.id]?.lastAccessed || Date.now()
      })).sort((a, b) => a.lastAccessed - b.lastAccessed);
      
      // Take the oldest tabs
      tabsToClose = tabsWithActivity
        .slice(0, tabsToCloseCount)
        .map(item => item.tab.id);
    } else if (state.settings.closeStrategy === 'leastUsed') {
      // Get activity data to find least used tabs
      const activityData = await getTabActivityData();
      
      // Sort tabs by access count (least used first)
      const tabsWithActivity = tabs.map(tab => ({
        tab,
        accessCount: activityData[tab.id]?.accessCount || 0
      })).sort((a, b) => a.accessCount - b.accessCount);
      
      // Take the least used tabs
      tabsToClose = tabsWithActivity
        .slice(0, tabsToCloseCount)
        .map(item => item.tab.id);
    }
    
    // If we found tabs to close, save them first (to prevent data loss) and then close them
    if (tabsToClose.length > 0) {
      // Get tab data for the tabs to close
      const tabsToSave = await new Promise(resolve => {
        chrome.tabs.query({ currentWindow: true }, (allTabs) => {
          const filtered = allTabs.filter(tab => tabsToClose.includes(tab.id));
          resolve(filtered);
        });
      });
      
      // Save the tabs first
      const tabData = tabsToSave.map(tab => ({
        url: tab.url,
        title: tab.title,
        favIconUrl: tab.favIconUrl || '',
        savedAt: Date.now()
      }));
      
      // Save to storage
      await saveTabGroup(`Auto-closed tabs - ${new Date().toLocaleString()}`, tabData);
      
      // Then close the tabs
      chrome.tabs.remove(tabsToClose);
      
      // Show a notification about the closed tabs
      chrome.notifications.create('tabs-closed-notification', {
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'Tabs Closed',
        message: `${tabsToClose.length} tabs were closed based on your settings. They have been saved for reference.`,
        priority: 1
      });
    }
  } catch (error) {
    console.error('Error handling tab limit action:', error);
  }
};

// Listen for tab creation to check tab limit
chrome.tabs.onCreated.addListener(() => {
  checkTabLimit();
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
  
  // Start checking tab limit periodically
  if (TAB_LIMIT_CHECK_INTERVAL > 0) {
    setInterval(checkTabLimit, TAB_LIMIT_CHECK_INTERVAL);
  }
};

// Call initialization
init(); 