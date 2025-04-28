// Content Script
// This script runs in the context of web pages

// Extract page metadata for better tab categorization
function extractPageMetadata() {
  const metadata = {
    title: document.title,
    description: '',
    keywords: [],
    textContent: '',
    headings: [],
    links: []
  };
  
  // Get meta description
  const descriptionMeta = document.querySelector('meta[name="description"]');
  if (descriptionMeta) {
    metadata.description = descriptionMeta.getAttribute('content');
  }
  
  // Get meta keywords
  const keywordsMeta = document.querySelector('meta[name="keywords"]');
  if (keywordsMeta) {
    const keywordsStr = keywordsMeta.getAttribute('content');
    metadata.keywords = keywordsStr ? keywordsStr.split(',').map(k => k.trim()) : [];
  }
  
  // Extract important text content (headings, paragraphs)
  const headings = document.querySelectorAll('h1, h2, h3');
  metadata.headings = Array.from(headings).map(h => h.textContent.trim()).filter(Boolean);
  
  // Get main content (simplified)
  const mainContent = document.querySelector('main') || document.querySelector('article') || document.body;
  const paragraphs = mainContent.querySelectorAll('p');
  metadata.textContent = Array.from(paragraphs)
    .map(p => p.textContent.trim())
    .filter(text => text.length > 20) // Only substantial paragraphs
    .slice(0, 5) // Limit to first 5 paragraphs
    .join(' ');
  
  // Extract links for related content detection
  const links = document.querySelectorAll('a[href]');
  metadata.links = Array.from(links)
    .map(link => ({
      href: link.href,
      text: link.textContent.trim()
    }))
    .filter(link => 
      link.href.startsWith('http') && 
      link.text && 
      link.text.length > 0 &&
      !link.href.includes('javascript:')
    )
    .slice(0, 20); // Limit to 20 links
  
  return metadata;
}

// Send page metadata to the background script for analysis
function sendPageMetadata() {
  const metadata = extractPageMetadata();
  
  chrome.runtime.sendMessage({
    action: 'updatePageMetadata',
    data: {
      url: window.location.href,
      metadata,
      timestamp: Date.now()
    }
  });
}

// Wait for the page to be fully loaded before extracting metadata
window.addEventListener('load', () => {
  // Give the page a bit more time to stabilize (especially for SPAs)
  setTimeout(sendPageMetadata, 1500);
});

// MutationObserver to track significant page changes
// This is useful for Single Page Applications where URL might change without a page reload
let lastUrl = window.location.href;
const observer = new MutationObserver(() => {
  if (window.location.href !== lastUrl) {
    lastUrl = window.location.href;
    // Wait a bit for the page content to update after URL change
    setTimeout(sendPageMetadata, 1500);
  }
});

// Start observing the document with configured parameters
observer.observe(document, {
  subtree: true,
  childList: true
});

// Listen for messages from popup or background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getPageMetadata') {
    const metadata = extractPageMetadata();
    sendResponse({ 
      success: true, 
      data: {
        url: window.location.href,
        metadata,
        timestamp: Date.now()
      }
    });
  }
  
  return true; // Indicate we'll respond asynchronously
}); 