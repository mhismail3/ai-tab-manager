// Tab activity model
// This module provides functions for tracking and analyzing tab usage patterns

// Storage key for tab activity data
const TAB_ACTIVITY_STORAGE_KEY = 'ai_tab_manager_tab_activity';

// Get tab activity data from storage
export const getTabActivityData = async () => {
  try {
    const data = await new Promise(resolve => {
      chrome.storage.local.get(TAB_ACTIVITY_STORAGE_KEY, (result) => {
        resolve(result[TAB_ACTIVITY_STORAGE_KEY] || {});
      });
    });
    
    return data;
  } catch (error) {
    console.error('Error loading tab activity data:', error);
    return {};
  }
};

// Update tab activity data
export const updateTabActivity = async (tabId, activityData) => {
  try {
    // Get existing data
    const existingData = await getTabActivityData();
    
    // Update tab data
    existingData[tabId] = {
      ...(existingData[tabId] || {}),
      ...activityData,
      lastUpdated: Date.now()
    };
    
    // Save back to storage
    await chrome.storage.local.set({
      [TAB_ACTIVITY_STORAGE_KEY]: existingData
    });
    
    return {
      success: true
    };
  } catch (error) {
    console.error('Error updating tab activity:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Record a tab access
export const recordTabAccess = async (tabId) => {
  await updateTabActivity(tabId, {
    lastAccessed: Date.now(),
    accessCount: await getTabAccessCount(tabId) + 1
  });
};

// Get the number of times a tab has been accessed
export const getTabAccessCount = async (tabId) => {
  const activityData = await getTabActivityData();
  return activityData[tabId]?.accessCount || 0;
};

// Get the most frequently accessed tabs
export const getMostFrequentTabs = async (limit = 10) => {
  const activityData = await getTabActivityData();
  
  // Convert to array for sorting
  const tabsWithActivity = Object.entries(activityData).map(([tabId, data]) => ({
    tabId: parseInt(tabId, 10),
    ...data
  }));
  
  // Sort by access count in descending order
  const sortedTabs = tabsWithActivity.sort((a, b) => 
    (b.accessCount || 0) - (a.accessCount || 0)
  );
  
  // Return the top N
  return sortedTabs.slice(0, limit);
};

// Get the least recently accessed tabs
export const getLeastRecentTabs = async (limit = 10) => {
  const activityData = await getTabActivityData();
  
  // Convert to array for sorting
  const tabsWithActivity = Object.entries(activityData)
    .filter(([_, data]) => data.lastAccessed) // Filter out tabs with no access data
    .map(([tabId, data]) => ({
      tabId: parseInt(tabId, 10),
      ...data
    }));
  
  // Sort by last accessed in ascending order (oldest first)
  const sortedTabs = tabsWithActivity.sort((a, b) => 
    (a.lastAccessed || 0) - (b.lastAccessed || 0)
  );
  
  // Return the oldest N
  return sortedTabs.slice(0, limit);
};

// Calculate tab usage statistics
export const getTabUsageStatistics = async () => {
  const activityData = await getTabActivityData();
  
  // Get current tabs to ensure data accuracy
  const tabs = await new Promise(resolve => {
    chrome.tabs.query({}, (tabs) => {
      if (chrome.runtime.lastError) {
        console.error("Error querying tabs for statistics:", chrome.runtime.lastError);
        resolve([]);
      } else {
        resolve(tabs || []);
      }
    });
  });
  
  // The true count of open tabs comes from the tabs API, not the activity data
  const actualTabCount = tabs.length;
  
  // Calculate various metrics
  let totalAccesses = 0;
  let tabsWithActivity = 0;
  let oldestAccess = Date.now();
  let newestAccess = 0;
  
  Object.values(activityData).forEach(data => {
    if (data.accessCount) {
      totalAccesses += data.accessCount;
      tabsWithActivity++;
    }
    
    if (data.lastAccessed) {
      oldestAccess = Math.min(oldestAccess, data.lastAccessed);
      newestAccess = Math.max(newestAccess, data.lastAccessed);
    }
  });
  
  return {
    totalTabs: actualTabCount, // Use the actual tab count from chrome.tabs.query
    tabsWithActivity,
    totalAccesses,
    averageAccessesPerTab: tabsWithActivity > 0 ? totalAccesses / tabsWithActivity : 0,
    oldestAccess,
    newestAccess,
    daysSinceOldestAccess: (Date.now() - oldestAccess) / (1000 * 60 * 60 * 24)
  };
};

// Clean up activity data for tabs that no longer exist
export const cleanUpActivityData = async () => {
  // Get current tabs
  const tabs = await new Promise(resolve => {
    chrome.tabs.query({}, (tabs) => resolve(tabs));
  });
  
  const tabIds = new Set(tabs.map(tab => tab.id));
  const activityData = await getTabActivityData();
  const cleanedData = {};
  
  // Only keep data for tabs that still exist
  Object.entries(activityData).forEach(([tabId, data]) => {
    const id = parseInt(tabId, 10);
    if (tabIds.has(id)) {
      cleanedData[tabId] = data;
    }
  });
  
  // Save cleaned data
  await chrome.storage.local.set({
    [TAB_ACTIVITY_STORAGE_KEY]: cleanedData
  });
  
  return {
    success: true,
    removedCount: Object.keys(activityData).length - Object.keys(cleanedData).length
  };
}; 