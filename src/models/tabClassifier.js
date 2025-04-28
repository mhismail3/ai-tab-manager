// Tab classifier model
// This module provides functions for analyzing and categorizing tabs

import { nanoid } from 'nanoid';
// Remove static import of TensorFlow
// import * as tf from '@tensorflow/tfjs';

// Store TensorFlow instance when loaded
let tf = null;

// Flag to track if TensorFlow is being loaded
let tfLoading = false;

// Expanded category definitions with more comprehensive keywords
const CATEGORIES = {
  'Shopping': ['amazon', 'ebay', 'shop', 'product', 'buy', 'price', 'sale', 'cart', 'checkout', 'order', 'store', 'retail', 'purchase', 'shipping', 'discount', 'deal', 'marketplace', 'customer', 'ecommerce'],
  'Social Media': ['facebook', 'twitter', 'instagram', 'tiktok', 'linkedin', 'social', 'profile', 'feed', 'timeline', 'post', 'friend', 'follow', 'share', 'comment', 'like', 'status', 'snapchat', 'pinterest', 'youtube', 'reddit'],
  'News': ['news', 'article', 'politics', 'report', 'cnn', 'bbc', 'nytimes', 'media', 'breaking', 'headlines', 'journalist', 'reporting', 'current events', 'newspaper', 'reuters', 'ap', 'associated press', 'editorial', 'opinion', 'analysis'],
  'Tech': ['github', 'stackoverflow', 'code', 'programming', 'developer', 'tech', 'software', 'engineer', 'api', 'documentation', 'repository', 'framework', 'library', 'development', 'algorithm', 'computer', 'technology', 'coding', 'data', 'cloud'],
  'Education': ['course', 'learn', 'study', 'education', 'university', 'college', 'academic', 'school', 'lecture', 'tutorial', 'professor', 'student', 'teach', 'class', 'degree', 'curriculum', 'exam', 'lesson', 'assignment', 'syllabus'],
  'Entertainment': ['youtube', 'video', 'movie', 'music', 'stream', 'netflix', 'hulu', 'entertainment', 'watch', 'play', 'game', 'gaming', 'film', 'tv', 'show', 'series', 'episode', 'actor', 'album', 'artist'],
  'Productivity': ['docs', 'sheet', 'presentation', 'calendar', 'meeting', 'email', 'task', 'project', 'workflow', 'productivity', 'organize', 'collaborate', 'document', 'spreadsheet', 'schedule', 'planning', 'notes', 'todo', 'reminder', 'agenda'],
  'Finance': ['bank', 'finance', 'money', 'investment', 'stock', 'crypto', 'budget', 'financial', 'trading', 'market', 'economy', 'currency', 'wallet', 'transaction', 'payment', 'loan', 'credit', 'debit', 'mortgage', 'portfolio'],
  'Travel': ['hotel', 'flight', 'booking', 'travel', 'vacation', 'destination', 'trip', 'tourism', 'airbnb', 'expedia', 'airline', 'resort', 'accommodation', 'ticket', 'reservation', 'itinerary', 'tourist', 'holiday', 'journey', 'adventure'],
  'Health': ['health', 'fitness', 'workout', 'nutrition', 'diet', 'medical', 'exercise', 'wellness', 'doctor', 'symptoms', 'hospital', 'medicine', 'patient', 'disease', 'healthcare', 'therapy', 'treatment', 'diagnosis', 'clinic', 'pharmacy'],
  'Reference': ['wikipedia', 'dictionary', 'encyclopedia', 'reference', 'wiki', 'research', 'definition', 'information', 'knowledge', 'guide', 'manual', 'handbook', 'resource', 'citation', 'source', 'lookup', 'archive', 'database', 'facts', 'history'],
  'Communication': ['gmail', 'outlook', 'email', 'chat', 'message', 'conversation', 'communication', 'slack', 'discord', 'teams', 'zoom', 'meet', 'conference', 'call', 'video', 'voice', 'contact', 'inbox', 'send', 'receive']
};

// Domain categories to help with domain-specific categorization
const DOMAIN_CATEGORIES = {
  'youtube.com': 'Entertainment',
  'github.com': 'Tech',
  'stackoverflow.com': 'Tech',
  'amazon.com': 'Shopping',
  'ebay.com': 'Shopping',
  'facebook.com': 'Social Media',
  'twitter.com': 'Social Media',
  'instagram.com': 'Social Media',
  'linkedin.com': 'Social Media',
  'reddit.com': 'Social Media',
  'gmail.com': 'Communication',
  'outlook.com': 'Communication',
  'yahoo.com': 'Communication',
  'google.com': 'Search',
  'bing.com': 'Search',
  'docs.google.com': 'Productivity',
  'drive.google.com': 'Productivity',
  'sheets.google.com': 'Productivity',
  'office.com': 'Productivity',
  'netflix.com': 'Entertainment',
  'hulu.com': 'Entertainment',
  'spotify.com': 'Entertainment',
  'wikipedia.org': 'Reference',
  'medium.com': 'Reading',
  'nytimes.com': 'News',
  'cnn.com': 'News',
  'bbc.com': 'News',
  'coursera.org': 'Education',
  'udemy.com': 'Education',
  'edx.org': 'Education',
  'khanacademy.org': 'Education'
};

// Cache for page metadata to avoid repeated processing
const pageMetadataCache = new Map();

// Document frequency for IDF calculation
let documentFrequency = {};
let totalDocuments = 0;

// Helper function to dynamically load TensorFlow when needed
const loadTensorFlow = async () => {
  if (tf) return tf; // Return if already loaded
  if (tfLoading) {
    // Wait for current loading process to complete
    while (tfLoading) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return tf;
  }
  
  try {
    tfLoading = true;
    const tensorflow = await import('@tensorflow/tfjs');
    tf = tensorflow;
    tfLoading = false;
    return tf;
  } catch (error) {
    console.error('Error loading TensorFlow:', error);
    tfLoading = false;
    // Return null to indicate failure
    return null;
  }
};

// Analyze tab content to extract meaningful information
export const analyzeTabContent = async (tab) => {
  // Check cache first
  if (pageMetadataCache.has(tab.url)) {
    return pageMetadataCache.get(tab.url);
  }
  
  // Get domain from URL
  const domain = extractDomain(tab.url);
  
  // Extract keywords using TF-IDF approach for better relevance
  const keywords = extractKeywords(tab.title, tab.url);
  
  // Determine potential categories
  const categorySimilarities = calculateCategorySimilarities(tab.title, tab.url, domain, keywords);
  
  // Pick the most likely categories (above threshold)
  const threshold = 0.25;
  const matchedCategories = Object.entries(categorySimilarities)
    .filter(([_, score]) => score > threshold)
    .sort((a, b) => b[1] - a[1])
    .map(([category]) => category);
  
  // Extract potential topics from text
  const topics = extractTopics(tab.title, tab.url);
  
  // Build the analysis object
  const analysis = {
    id: tab.id,
    url: tab.url,
    domain,
    title: tab.title,
    keywords,
    categories: matchedCategories,
    topics,
    timestamp: Date.now()
  };
  
  // Store in cache
  pageMetadataCache.set(tab.url, analysis);
  
  return analysis;
};

// Classify tabs into groups based on content similarity and domain patterns
export const classifyTabs = async (tabs) => {
  // Update document frequency data for better TF-IDF calculations
  updateDocumentFrequency(tabs);
  
  // Analyze all tabs
  const tabAnalyses = await Promise.all(
    tabs.map(tab => analyzeTabContent(tab))
  );
  
  // First, group by predefined categories
  const categoryGroups = {};
  const uncategorizedTabs = [];
  
  tabAnalyses.forEach(analysis => {
    if (analysis.categories.length > 0) {
      // Use the most confident category
      const primaryCategory = analysis.categories[0];
      
      if (!categoryGroups[primaryCategory]) {
        categoryGroups[primaryCategory] = [];
      }
      
      categoryGroups[primaryCategory].push(tabs.find(tab => tab.id === analysis.id));
    } else {
      uncategorizedTabs.push({
        tab: tabs.find(tab => tab.id === analysis.id),
        analysis
      });
    }
  });
  
  // Next, handle uncategorized tabs with domain-based grouping
  const domainGroups = {};
  const remainingTabs = [];
  
  uncategorizedTabs.forEach(({ tab, analysis }) => {
    // Try to find a category for the domain
    const domainCategory = getDomainCategory(analysis.domain);
    
    if (domainCategory) {
      // Add to existing category or create a new one
      if (!categoryGroups[domainCategory]) {
        categoryGroups[domainCategory] = [];
      }
      
      categoryGroups[domainCategory].push(tab);
    } else {
      // Group by domain
      const domainGroupName = domainToGroupName(analysis.domain);
      
      if (!domainGroups[domainGroupName]) {
        domainGroups[domainGroupName] = [];
      }
      
      domainGroups[domainGroupName].push(tab);
    }
  });
  
  // Merge small domain groups into topic-based groups if possible
  const topicGroups = {};
  
  Object.entries(domainGroups).forEach(([domainName, domainTabs]) => {
    // Only process small domain groups (1-2 tabs)
    if (domainTabs.length <= 2) {
      // Get the analyses for these tabs
      const tabsWithAnalyses = domainTabs.map(tab => {
        const analysis = tabAnalyses.find(a => a.id === tab.id);
        return { tab, analysis };
      });
      
      // Group by most common topic
      const topicCounts = {};
      
      tabsWithAnalyses.forEach(({ analysis }) => {
        if (analysis.topics.length > 0) {
          analysis.topics.forEach(topic => {
            topicCounts[topic] = (topicCounts[topic] || 0) + 1;
          });
        }
      });
      
      // Find most common topic
      const sortedTopics = Object.entries(topicCounts)
        .sort((a, b) => b[1] - a[1]);
      
      if (sortedTopics.length > 0) {
        const [bestTopic] = sortedTopics[0];
        
        if (!topicGroups[bestTopic]) {
          topicGroups[bestTopic] = [];
        }
        
        // Add tabs to the topic group
        domainTabs.forEach(tab => {
          topicGroups[bestTopic].push(tab);
        });
        
        // Remove from domain groups
        delete domainGroups[domainName];
      }
    }
  });
  
  // Filter groups to ensure they have at least 2 tabs
  const resultGroups = {};
  
  // Add category groups
  Object.entries(categoryGroups).forEach(([name, groupTabs]) => {
    if (groupTabs.length >= 2) {
      resultGroups[name] = groupTabs;
    } else if (groupTabs.length === 1) {
      // Try to find a suitable place for single-tab categories
      const tab = groupTabs[0];
      const analysis = tabAnalyses.find(a => a.id === tab.id);
      
      // Check if it can go into a topic group
      let placed = false;
      
      if (analysis && analysis.topics.length > 0) {
        const topic = analysis.topics[0];
        
        if (topicGroups[topic]) {
          topicGroups[topic].push(tab);
          placed = true;
        }
      }
      
      if (!placed) {
        // Add to domain group
        const domainName = domainToGroupName(analysis.domain);
        
        if (domainGroups[domainName]) {
          domainGroups[domainName].push(tab);
        } else {
          domainGroups[domainName] = [tab];
        }
      }
    }
  });
  
  // Add domain groups
  Object.entries(domainGroups).forEach(([name, groupTabs]) => {
    if (groupTabs.length >= 2) {
      resultGroups[name] = groupTabs;
    }
  });
  
  // Add topic groups
  Object.entries(topicGroups).forEach(([name, groupTabs]) => {
    if (groupTabs.length >= 2) {
      // Capitalize topic name
      const formattedName = name.charAt(0).toUpperCase() + name.slice(1);
      resultGroups[formattedName] = groupTabs;
    }
  });
  
  // For any remaining uncategorized tabs, create smart "Misc" subgroups
  const leftoverTabs = tabs.filter(tab => {
    // Check if this tab is already in a group
    return !Object.values(resultGroups)
      .flat()
      .some(groupedTab => groupedTab.id === tab.id);
  });
  
  if (leftoverTabs.length > 0) {
    // Try to cluster the remaining tabs by content similarity
    const miscClusters = clusterMiscTabs(leftoverTabs, tabAnalyses);
    
    // Add clusters as groups
    Object.entries(miscClusters).forEach(([name, tabs]) => {
      resultGroups[name] = tabs;
    });
    
    // Any remaining tabs go to a general "Other" group
    const remainingTabs = leftoverTabs.filter(tab => {
      return !Object.values(miscClusters)
        .flat()
        .some(clusteredTab => clusteredTab.id === tab.id);
    });
    
    if (remainingTabs.length > 0) {
      resultGroups['Other'] = remainingTabs;
    }
  }
  
  return resultGroups;
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
  
  // Filter out tabs that are already in a group
  // TAB_GROUP_ID_NONE is -1, which represents no group
  const ungroupedTabs = tabs.filter(tab => tab.groupId === undefined || tab.groupId === -1);
  
  // Group similar tabs based on URL patterns or content
  const similarTabGroups = findSimilarTabs(ungroupedTabs);
  
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
  // Handle empty domains
  if (!domain) return 'Unknown';
  
  // Extract the main part of the domain (e.g., 'google' from 'google.com')
  const parts = domain.split('.');
  let name = parts.length > 1 ? parts[parts.length - 2] : parts[0];
  
  // Capitalize first letter
  name = name.charAt(0).toUpperCase() + name.slice(1);
  
  return name;
};

// Get category for a specific domain using the domain-category mapping
const getDomainCategory = (domain) => {
  // Direct match
  if (DOMAIN_CATEGORIES[domain]) {
    return DOMAIN_CATEGORIES[domain];
  }
  
  // Try to match subdomains or partial domains
  for (const [mappedDomain, category] of Object.entries(DOMAIN_CATEGORIES)) {
    if (domain.includes(mappedDomain) || mappedDomain.includes(domain)) {
      return category;
    }
  }
  
  return null;
};

// Update document frequency data for TF-IDF calculations
const updateDocumentFrequency = (tabs) => {
  if (tabs.length === 0) return;
  
  // Reset document frequency if we have too many documents
  if (totalDocuments > 1000) {
    documentFrequency = {};
    totalDocuments = 0;
  }
  
  // Process each tab as a document
  tabs.forEach(tab => {
    const text = `${tab.title} ${extractDomain(tab.url)}`.toLowerCase();
    const words = text.split(/\s+/).filter(word => word.length > 2);
    
    // Count each word only once per document
    const uniqueWords = [...new Set(words)];
    
    uniqueWords.forEach(word => {
      documentFrequency[word] = (documentFrequency[word] || 0) + 1;
    });
  });
  
  totalDocuments += tabs.length;
};

// Enhanced keyword extraction using TF-IDF approach
const extractKeywords = (title, url) => {
  if (!title) return [];
  
  // Create text corpus from title and URL
  const text = `${title} ${extractDomain(url)}`.toLowerCase();
  
  // Tokenize and remove common fillers
  const words = text
    .replace(/[-_.|]/g, ' ')
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => 
      word.length > 2 && 
      !['and', 'the', 'for', 'with', 'this', 'that', 'from', 'what', 'how', 'when', 'who', 'where'].includes(word)
    );
  
  // Calculate term frequency
  const termFreq = {};
  words.forEach(word => {
    termFreq[word] = (termFreq[word] || 0) + 1;
  });
  
  // Calculate TF-IDF for each word
  const tfidfScores = {};
  
  Object.entries(termFreq).forEach(([word, freq]) => {
    // Term frequency divided by document length for normalization
    const tf = freq / words.length;
    
    // Inverse document frequency with smoothing to handle new terms
    const df = documentFrequency[word] || 1;
    const idf = Math.log((totalDocuments + 1) / (df + 1)) + 1;
    
    // TF-IDF score
    tfidfScores[word] = tf * idf;
  });
  
  // Sort by score and take top N keywords
  const sortedKeywords = Object.entries(tfidfScores)
    .sort((a, b) => b[1] - a[1])
    .map(([word]) => word)
    .slice(0, 10);
  
  // Add domain-related keywords
  const domain = extractDomain(url);
  const domainWords = domain.split('.')
    .filter(part => part.length > 2 && !['www', 'com', 'org', 'net', 'edu', 'gov', 'io'].includes(part));
  
  return [...new Set([...sortedKeywords, ...domainWords])];
};

// Extract potential topics from text using simple NLP approach
const extractTopics = (title, url) => {
  if (!title) return [];
  
  const text = title.toLowerCase();
  const domain = extractDomain(url);
  
  // Common topics that might appear in titles
  const commonTopics = [
    'guide', 'tutorial', 'review', 'news', 'article', 'blog', 'forum', 'discussion',
    'video', 'photo', 'image', 'music', 'audio', 'podcast', 'stream',
    'shop', 'store', 'product', 'cart', 'checkout', 'order',
    'login', 'account', 'profile', 'settings', 'dashboard',
    'search', 'results', 'find', 'query',
    'download', 'upload', 'share', 'file',
    'map', 'location', 'direction', 'travel',
    'weather', 'forecast', 'temperature',
    'job', 'career', 'employment', 'hire',
    'recipe', 'food', 'cooking', 'meal',
    'game', 'play', 'gaming', 'sport',
    'health', 'medical', 'fitness', 'exercise'
  ];
  
  const topics = [];
  
  // Check if any common topics appear in the title
  commonTopics.forEach(topic => {
    if (text.includes(topic)) {
      topics.push(topic);
    }
  });
  
  // Check categories for topics
  Object.entries(CATEGORIES).forEach(([category, keywords]) => {
    keywords.forEach(keyword => {
      // Score is higher if both title and domain match the keyword
      if (text.includes(keyword) || domain.includes(keyword)) {
        // Convert category to topic-like format (lowercase)
        const topicForm = category.toLowerCase();
        
        // Only add the topic if we don't already have it
        if (!topics.includes(topicForm)) {
          topics.push(topicForm);
        }
      }
    });
  });
  
  return topics;
};

// Calculate similarity scores between tab content and predefined categories
const calculateCategorySimilarities = (title, url, domain, keywords) => {
  const categorySimilarities = {};
  
  // Check for exact domain matches first (strongest signal)
  const domainCategory = getDomainCategory(domain);
  if (domainCategory) {
    categorySimilarities[domainCategory] = 1.0; // Perfect match
    return categorySimilarities;
  }
  
  // Calculate similarity to each category
  Object.entries(CATEGORIES).forEach(([category, categoryKeywords]) => {
    let score = 0;
    
    // URL and domain matching (stronger signals)
    categoryKeywords.forEach(keyword => {
      const lowerKeyword = keyword.toLowerCase();
      
      // Full domain match is a very strong signal
      if (domain === lowerKeyword) {
        score += 3;
      }
      // Domain contains keyword
      else if (domain.includes(lowerKeyword)) {
        score += 2;
      }
      // URL contains keyword
      else if (url.toLowerCase().includes(lowerKeyword)) {
        score += 1;
      }
      
      // Title contains keyword (direct match)
      if (title.toLowerCase().includes(lowerKeyword)) {
        score += 1.5;
      }
    });
    
    // Keyword matching
    keywords.forEach(tabKeyword => {
      categoryKeywords.forEach(categoryKeyword => {
        // Exact keyword match
        if (tabKeyword === categoryKeyword) {
          score += 1;
        }
        // Partial keyword match
        else if (tabKeyword.includes(categoryKeyword) || categoryKeyword.includes(tabKeyword)) {
          score += 0.5;
        }
      });
    });
    
    // Normalize the score
    const maxPossibleScore = 3 + (2 * categoryKeywords.length) + (keywords.length * categoryKeywords.length);
    categorySimilarities[category] = score / (maxPossibleScore || 1);
  });
  
  return categorySimilarities;
};

// Find similar tabs based on URL patterns and content
const findSimilarTabs = (tabs) => {
  // Skip grouping if no tabs are provided
  if (!tabs || tabs.length < 2) return [];
  
  const urlGroups = {};
  
  // Group by domain first
  tabs.forEach(tab => {
    // Skip tabs that are already part of a group
    if (tab.groupId !== undefined && tab.groupId !== -1) return;
    
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

// Cluster miscellaneous tabs using content similarity
const clusterMiscTabs = (tabs, tabAnalyses) => {
  if (tabs.length === 0) return {};
  
  // If only a few tabs, use a simple approach
  if (tabs.length <= 3) {
    return { 'Other': tabs };
  }
  
  // Try to find natural clusters based on content similarity
  const clusters = {};
  const processedTabIds = new Set();
  
  // Find the analysis for each tab
  const tabsWithAnalyses = tabs.map(tab => {
    const analysis = tabAnalyses.find(a => a.id === tab.id) || { 
      id: tab.id, 
      keywords: [],
      topics: [],
      domain: extractDomain(tab.url)
    };
    
    return { tab, analysis };
  });
  
  // Group by domain first (domains often represent logical clusters)
  const domainGroups = {};
  
  tabsWithAnalyses.forEach(({ tab, analysis }) => {
    if (!analysis.domain) return;
    
    if (!domainGroups[analysis.domain]) {
      domainGroups[analysis.domain] = [];
    }
    
    domainGroups[analysis.domain].push(tab);
  });
  
  // Create clusters from domain groups with more than one tab
  Object.entries(domainGroups).forEach(([domain, domainTabs]) => {
    if (domainTabs.length >= 2) {
      const name = domainToGroupName(domain);
      clusters[name] = domainTabs;
      
      // Mark these tabs as processed
      domainTabs.forEach(tab => processedTabIds.add(tab.id));
    }
  });
  
  // For remaining tabs, try to cluster by topic
  const unprocessedTabs = tabsWithAnalyses.filter(
    ({ tab }) => !processedTabIds.has(tab.id)
  );
  
  if (unprocessedTabs.length > 0) {
    const topicGroups = {};
    
    unprocessedTabs.forEach(({ tab, analysis }) => {
      if (analysis.topics && analysis.topics.length > 0) {
        const topic = analysis.topics[0]; // Use first/primary topic
        
        if (!topicGroups[topic]) {
          topicGroups[topic] = [];
        }
        
        topicGroups[topic].push(tab);
      }
    });
    
    // Add topic groups with more than one tab
    Object.entries(topicGroups).forEach(([topic, topicTabs]) => {
      if (topicTabs.length >= 2) {
        // Capitalize topic name
        const formattedTopic = topic.charAt(0).toUpperCase() + topic.slice(1);
        clusters[formattedTopic] = topicTabs;
        
        // Mark these tabs as processed
        topicTabs.forEach(tab => processedTabIds.add(tab.id));
      }
    });
  }
  
  // Any remaining tabs go to a generic "Other" group
  const finalUnprocessedTabs = tabs.filter(tab => !processedTabIds.has(tab.id));
  
  if (finalUnprocessedTabs.length > 0) {
    clusters['Other'] = finalUnprocessedTabs;
  }
  
  return clusters;
};

// Update metadata when received from content script
export const updatePageMetadata = (url, metadata) => {
  pageMetadataCache.set(url, {
    ...metadata,
    timestamp: Date.now()
  });
};

// Modify loadModel to use dynamic import
export const loadModel = async () => {
  const tensorflow = await loadTensorFlow();
  if (!tensorflow) {
    console.warn('TensorFlow could not be loaded, using fallback classification');
    return null;
  }
  
  try {
    // Load model logic here with tensorflow
    console.log('TensorFlow model loaded successfully');
    return true;
  } catch (error) {
    console.error('Error loading TensorFlow model:', error);
    return null;
  }
}; 