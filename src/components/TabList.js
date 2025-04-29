import React, { useEffect, useState } from 'react';
import { FiX, FiExternalLink, FiStar, FiClock, FiCircle } from 'react-icons/fi';

const TabList = ({ tabs, loading, showFavIcon = true, onClose, onSelect }) => {
  // Estimate height based on number of tabs (approx. 80px per tab with margins)
  const [maxHeight, setMaxHeight] = useState(null);
  
  useEffect(() => {
    // Dynamically calculate max height:
    // - For dashboard view (when window is large), allow more space
    // - For popup view (when window is small), keep more constrained
    const isPopup = window.innerWidth < 600;
    const tabHeight = 80; // Approximate height of a tab item in pixels
    const viewportHeight = window.innerHeight;
    const maxAvailableHeight = viewportHeight - (isPopup ? 300 : 200); // Reserve space for header and other UI
    
    // If we have many tabs, limit the container height to prevent it from becoming too large
    // Only apply max-height if tabs would exceed the available space
    const calculatedHeight = tabs.length * tabHeight;
    if (calculatedHeight > maxAvailableHeight) {
      setMaxHeight(`${maxAvailableHeight}px`);
    } else {
      setMaxHeight(null); // No height restriction needed
    }
  }, [tabs.length]);

  const handleTabClick = (tab) => {
    if (onSelect) {
      onSelect(tab);
    } else {
      // Default behavior: focus on the tab
      chrome.tabs.update(tab.id, { active: true });
      chrome.windows.update(tab.windowId, { focused: true });
    }
  };

  const handleTabClose = (e, tabId) => {
    e.stopPropagation();
    
    chrome.tabs.remove(tabId, () => {
      if (onClose) {
        onClose(tabId);
      }
    });
  };

  if (loading) {
    return (
      <div className="loading-state" style={{ textAlign: 'center', padding: '20px 0' }}>
        <div className="loading-spinner" style={{ 
          width: '20px', 
          height: '20px', 
          border: '2px solid rgba(0, 0, 0, 0.1)', 
          borderTopColor: 'var(--primary)',
          borderRadius: '50%',
          margin: '0 auto',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p style={{ marginTop: '8px', color: '#6B7280' }}>Loading tabs...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (tabs.length === 0) {
    return (
      <div className="empty-state" style={{ 
        textAlign: 'center', 
        padding: '30px 10px',
        backgroundColor: '#f9fafb',
        borderRadius: '8px'
      }}>
        <FiExternalLink size={24} style={{ color: '#9CA3AF', marginBottom: '12px' }} />
        <p style={{ margin: '0', color: '#6B7280' }}>No tabs found</p>
      </div>
    );
  }

  return (
    <ul style={{ 
      listStyle: 'none', 
      padding: 0, 
      margin: 0,
      maxHeight: maxHeight,
      overflowY: maxHeight ? 'auto' : 'visible'
    }}>
      {tabs.map(tab => (
        <li 
          key={tab.id}
          onClick={() => handleTabClick(tab)}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '8px',
            borderRadius: '6px',
            marginBottom: '4px',
            cursor: 'pointer',
            background: 'white',
            border: '1px solid var(--border-color)',
            transition: 'background-color 0.1s ease'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#f9fafb';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = 'white';
          }}
        >
          {showFavIcon && (
            <>
              {tab.favIconUrl ? (
                <img 
                  src={tab.favIconUrl} 
                  alt=""
                  style={{
                    width: '16px',
                    height: '16px',
                    marginRight: '10px',
                    objectFit: 'contain'
                  }}
                  onError={(e) => {
                    // Replace with a placeholder instead of hiding
                    e.target.style.display = 'none';
                    e.target.parentNode.innerHTML = '<div style="width: 16px; height: 16px; margin-right: 10px; display: flex; align-items: center; justify-content: center; color: #9CA3AF;"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle></svg></div>';
                  }}
                />
              ) : (
                <div style={{
                  width: '16px',
                  height: '16px',
                  marginRight: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#9CA3AF'
                }}>
                  <FiCircle size={14} />
                </div>
              )}
            </>
          )}
          
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              fontSize: '13px',
              fontWeight: 500
            }}>
              {tab.title}
            </div>
            <div style={{
              wordBreak: 'break-all',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              fontSize: '11px',
              color: '#6B7280',
              maxHeight: '2.4em',
              lineHeight: '1.2em'
            }}>
              {tab.url}
            </div>
          </div>
          
          <button
            onClick={(e) => handleTabClose(e, tab.id)}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '5px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginLeft: '5px',
              color: '#9CA3AF',
              cursor: 'pointer'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#f3f4f6';
              e.currentTarget.style.color = '#EF4444';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#9CA3AF';
            }}
            title="Close tab"
          >
            <FiX size={14} />
          </button>
        </li>
      ))}
    </ul>
  );
};

export default TabList; 