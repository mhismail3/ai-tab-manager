// Tab storage model
// This module provides functions for storing and retrieving tab groups, saved sessions, etc.

// Default storage key for saved tab groups
const TAB_GROUPS_STORAGE_KEY = 'ai_tab_manager_saved_groups';

// Save a group of tabs to local storage
export const saveTabGroup = async (groupName, tabs) => {
  try {
    // Get existing groups
    const existingGroups = await loadTabGroups();
    
    // Create the new group
    const newGroup = {
      id: generateId(),
      name: groupName,
      tabs: tabs,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    // Add to existing groups
    existingGroups.push(newGroup);
    
    // Save back to storage
    await chrome.storage.local.set({
      [TAB_GROUPS_STORAGE_KEY]: existingGroups
    });
    
    return {
      success: true,
      group: newGroup
    };
  } catch (error) {
    console.error('Error saving tab group:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Load all saved tab groups from local storage
export const loadTabGroups = async () => {
  try {
    // Get data from storage
    const data = await new Promise(resolve => {
      chrome.storage.local.get(TAB_GROUPS_STORAGE_KEY, (result) => {
        resolve(result[TAB_GROUPS_STORAGE_KEY] || []);
      });
    });
    
    return data;
  } catch (error) {
    console.error('Error loading tab groups:', error);
    return [];
  }
};

// Delete a saved tab group
export const deleteTabGroup = async (groupId) => {
  try {
    // Get existing groups
    const existingGroups = await loadTabGroups();
    
    // Filter out the group to delete
    const updatedGroups = existingGroups.filter(group => group.id !== groupId);
    
    // Save back to storage
    await chrome.storage.local.set({
      [TAB_GROUPS_STORAGE_KEY]: updatedGroups
    });
    
    return {
      success: true
    };
  } catch (error) {
    console.error('Error deleting tab group:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Update an existing tab group
export const updateTabGroup = async (groupId, updates) => {
  try {
    // Get existing groups
    const existingGroups = await loadTabGroups();
    
    // Find the group to update
    const groupIndex = existingGroups.findIndex(group => group.id === groupId);
    
    if (groupIndex === -1) {
      throw new Error('Group not found');
    }
    
    // Update the group
    existingGroups[groupIndex] = {
      ...existingGroups[groupIndex],
      ...updates,
      updatedAt: Date.now()
    };
    
    // Save back to storage
    await chrome.storage.local.set({
      [TAB_GROUPS_STORAGE_KEY]: existingGroups
    });
    
    return {
      success: true,
      group: existingGroups[groupIndex]
    };
  } catch (error) {
    console.error('Error updating tab group:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Find tabs similar to a given tab based on URL patterns or content
export const getSimilarTabs = async (tab) => {
  try {
    // Get all current tabs
    const allTabs = await new Promise(resolve => {
      chrome.tabs.query({}, (tabs) => resolve(tabs));
    });
    
    // This is a simplified implementation for the demo
    // In a real extension, we would use more sophisticated algorithms
    
    // Extract domain from tab URL
    const tabDomain = extractDomain(tab.url);
    
    // Find tabs with the same domain
    const sameDomainTabs = allTabs.filter(t => {
      return t.id !== tab.id && extractDomain(t.url) === tabDomain;
    });
    
    return sameDomainTabs;
  } catch (error) {
    console.error('Error finding similar tabs:', error);
    return [];
  }
};

// Generate a random ID for a group
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

// Extract domain from URL
const extractDomain = (url) => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (e) {
    return '';
  }
}; 