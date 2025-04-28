// Tab classifier model
// This module provides functions for analyzing and categorizing tabs

import { nanoid } from 'nanoid';
import * as tf from '@tensorflow/tfjs';

// Simple category definitions with related keywords
const CATEGORIES = {
  'Shopping': ['amazon', 'ebay', 'shop', 'product', 'buy', 'price', 'sale', 'cart', 'checkout', 'order'],
  'Social Media': ['facebook', 'twitter', 'instagram', 'tiktok', 'linkedin', 'social', 'profile', 'feed', 'timeline', 'post'],
  'News': ['news', 'article', 'politics', 'report', 'cnn', 'bbc', 'nytimes', 'media', 'breaking', 'headlines'],
  'Tech': ['github', 'stackoverflow', 'code', 'programming', 'developer', 'tech', 'software', 'engineer', 'api', 'documentation'],
  'Education': ['course', 'learn', 'study', 'education', 'university', 'college', 'academic', 'school', 'lecture', 'tutorial'],
  'Entertainment': ['youtube', 'video', 'movie', 'music', 'stream', 'netflix', 'hulu', 'entertainment', 'watch', 'play'],
  'Productivity': ['docs', 'sheet', 'presentation', 'calendar', 'meeting', 'email', 'task', 'project', 'workflow', 'productivity'],
  'Finance': ['bank', 'finance', 'money', 'investment', 'stock', 'crypto', 'budget', 'financial', 'trading', 'market'],
  'Travel': ['hotel', 'flight', 'booking', 'travel', 'vacation', 'destination', 'trip', 'tourism', 'airbnb', 'expedia'],
  'Health': ['health', 'fitness', 'workout', 'nutrition', 'diet', 'medical', 'exercise', 'wellness', 'doctor', 'symptoms']
};

// Cache for page metadata to avoid repeated processing
const pageMetadataCache = new Map();

// Analyze tab content to extract meaningful information
export const analyzeTabContent = async (tab) => {
  // Check cache first
  if (pageMetadataCache.has(tab.url)) {
    return pageMetadataCache.get(tab.url);
  }
  
  // If we don't have metadata in cache, analyze tab title and URL for now
  // In a production extension, we would use the content script to extract more data
  const analysis = {
    id: tab.id,
    url: tab.url,
    domain: extractDomain(tab.url),
    title: tab.title,
    keywords: extractKeywords(tab.title, tab.url),
    categories: [],
    timestamp: Date.now()
  };
  
  // Store in cache
  pageMetadataCache.set(tab.url, analysis);
  
  return analysis;
};

// Classify tabs into groups based on content and URL patterns
export const classifyTabs = async (tabs) => {
  // Analyze all tabs
  const tabAnalyses = await Promise.all(
    tabs.map(tab => analyzeTabContent(tab))
  );
  
  // Simple rule-based categorization for the demo
  // In a real application, this would use a more sophisticated ML approach
  const groups = {};
  
  // First, group by obvious categories
  tabAnalyses.forEach(analysis => {
    let matched = false;
    
    // Try to match with predefined categories
    for (const [category, keywords] of Object.entries(CATEGORIES)) {
      const matchScore = calculateMatchScore(analysis, keywords);
      
      if (matchScore > 0.3) { // Threshold for category matching
        if (!groups[category]) {
          groups[category] = [];
        }
        
        groups[category].push(tabs.find(tab => tab.id === analysis.id));
        analysis.categories.push(category);
        matched = true;
        break; // Assign to only one category for now
      }
    }
    
    // If no category matched, group by domain
    if (!matched) {
      const domain = analysis.domain;
      const groupName = domainToGroupName(domain);
      
      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      
      groups[groupName].push(tabs.find(tab => tab.id === analysis.id));
    }
  });
  
  // Filter groups to ensure they have at least 2 tabs
  const filteredGroups = {};
  Object.entries(groups).forEach(([name, groupTabs]) => {
    if (groupTabs.length >= 2) {
      filteredGroups[name] = groupTabs;
    }
  });
  
  // For leftover tabs (in groups of 1), create a "Misc" group
  const groupedTabIds = new Set(
    Object.values(filteredGroups)
      .flat()
      .map(tab => tab.id)
  );
  
  const leftoverTabs = tabs.filter(tab => !groupedTabIds.has(tab.id));
  
  if (leftoverTabs.length > 0) {
    filteredGroups['Misc'] = leftoverTabs;
  }
  
  return filteredGroups;
};

// Suggest cleanup by identifying stale or similar tabs
export const suggestTabCleanup = async (tabs, tabActivity) => {
  if (!tabs || tabs.length === 0) return [];
  
  const now = Date.now();
  const ONE_WEEK = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
  
  // Find tabs that haven't been accessed for a week
  const staleTabs = tabs.filter(tab => {
    const activity = tabActivity[tab.id];
    if (!activity || !activity.lastAccessed) return false;
    
    return (now - activity.lastAccessed) > ONE_WEEK;
  });
  
  // Group similar tabs based on URL patterns or content
  const similarTabGroups = findSimilarTabs(tabs);
  
  return {
    staleTabs,
    similarTabGroups
  };
};

// Helper function to extract domain from URL
const extractDomain = (url) => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch (e) {
    return '';
  }
};

// Helper function to format domain into a readable group name
const domainToGroupName = (domain) => {
  // Extract the main part of the domain (e.g., 'google' from 'google.com')
  const parts = domain.split('.');
  let name = parts.length > 1 ? parts[parts.length - 2] : parts[0];
  
  // Capitalize first letter
  name = name.charAt(0).toUpperCase() + name.slice(1);
  
  return name;
};

// Helper function to extract keywords from title and URL
const extractKeywords = (title, url) => {
  if (!title) return [];
  
  // Remove common fillers and convert to lowercase
  const cleanTitle = title.toLowerCase()
    .replace(/[-_.|]/g, ' ')
    .replace(/[^\w\s]/g, '')
    .split(' ')
    .filter(word => word.length > 2 && !['and', 'the', 'for', 'with'].includes(word));
  
  // Add domain-related keywords
  const domain = extractDomain(url);
  const domainWords = domain.split('.')
    .filter(part => part.length > 2 && !['www', 'com', 'org', 'net'].includes(part));
  
  return [...new Set([...cleanTitle, ...domainWords])];
};

// Calculate match score between analysis and category keywords
const calculateMatchScore = (analysis, categoryKeywords) => {
  if (!analysis || !analysis.keywords || !categoryKeywords) return 0;
  
  // Count how many keywords match
  let matches = 0;
  
  // Check URL and domain first (stronger signal)
  categoryKeywords.forEach(keyword => {
    if (analysis.url.toLowerCase().includes(keyword.toLowerCase())) {
      matches += 2; // URL matches are weighted more
    }
    
    if (analysis.domain.toLowerCase().includes(keyword.toLowerCase())) {
      matches += 3; // Domain matches are weighted even more
    }
  });
  
  // Check extracted keywords
  analysis.keywords.forEach(keyword => {
    if (categoryKeywords.some(ck => keyword.includes(ck) || ck.includes(keyword))) {
      matches += 1;
    }
  });
  
  // Normalize score based on the number of keywords
  return matches / (categoryKeywords.length + analysis.keywords.length / 2);
};

// Find similar tabs based on URL patterns and content
const findSimilarTabs = (tabs) => {
  const urlGroups = {};
  
  // Group by domain first
  tabs.forEach(tab => {
    const domain = extractDomain(tab.url);
    if (!urlGroups[domain]) {
      urlGroups[domain] = [];
    }
    urlGroups[domain].push(tab);
  });
  
  // For each domain group, find similar patterns
  const similarGroups = [];
  
  Object.entries(urlGroups).forEach(([domain, domainTabs]) => {
    // Skip if only one tab from this domain
    if (domainTabs.length < 2) return;
    
    // Look for path similarities
    const pathGroups = {};
    
    domainTabs.forEach(tab => {
      try {
        const url = new URL(tab.url);
        const pathParts = url.pathname.split('/').filter(Boolean);
        
        // Use first path part as a group key if it exists
        const groupKey = pathParts.length > 0 ? pathParts[0] : '_root';
        
        if (!pathGroups[groupKey]) {
          pathGroups[groupKey] = [];
        }
        
        pathGroups[groupKey].push(tab);
      } catch (e) {
        // Fallback for invalid URLs
        if (!pathGroups['_invalid']) {
          pathGroups['_invalid'] = [];
        }
        pathGroups['_invalid'].push(tab);
      }
    });
    
    // Add path groups that have multiple tabs
    Object.entries(pathGroups).forEach(([path, pathTabs]) => {
      if (pathTabs.length >= 2) {
        similarGroups.push({
          id: nanoid(6),
          name: `${domainToGroupName(domain)} - ${path !== '_root' ? path : 'Main'}`,
          tabs: pathTabs,
          type: 'similar'
        });
      }
    });
  });
  
  return similarGroups;
};

// Update metadata when received from content script
export const updatePageMetadata = (url, metadata) => {
  pageMetadataCache.set(url, {
    ...metadata,
    timestamp: Date.now()
  });
};

// Load a pre-trained model for classification (optional future implementation)
export const loadModel = async () => {
  try {
    // This would load a pre-trained TensorFlow.js model
    // const model = await tf.loadLayersModel('path/to/model.json');
    // return model;
    console.log('Model loading placeholder - not implemented in demo');
    return null;
  } catch (error) {
    console.error('Error loading classification model:', error);
    return null;
  }
}; 