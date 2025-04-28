import React, { useState, useRef } from 'react';
import { FiSearch, FiX } from 'react-icons/fi';

const SearchBar = ({ onSearch, placeholder }) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  const handleChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    onSearch(value);
  };

  const handleClear = () => {
    setQuery('');
    onSearch('');
    inputRef.current?.focus();
  };

  const handleNaturalLanguageSearch = () => {
    if (!query.trim()) return;
    
    // For now, just use the regular search
    onSearch(query);
    
    // In a real implementation, we would send the natural language query
    // to our backend or use a local model to process it
    chrome.runtime.sendMessage(
      { action: 'naturalLanguageSearch', query },
      (response) => {
        // Process response
        console.log('NL search response:', response);
      }
    );
  };

  return (
    <div style={{
      position: 'relative',
      marginBottom: '16px'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        position: 'relative',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        background: 'white'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          padding: '0 10px',
          color: '#6B7280' 
        }}>
          <FiSearch />
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          placeholder={placeholder || "Search..."}
          style={{
            flex: 1,
            border: 'none',
            padding: '10px 0',
            outline: 'none',
            fontSize: '14px',
            background: 'transparent'
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleNaturalLanguageSearch();
            }
          }}
        />
        
        {query && (
          <button
            onClick={handleClear}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '0 10px',
              cursor: 'pointer',
              color: '#6B7280'
            }}
          >
            <FiX />
          </button>
        )}
      </div>
      
      {query && (
        <div className="search-hint" style={{
          position: 'absolute',
          bottom: '-20px',
          right: '0',
          fontSize: '11px',
          color: '#6B7280'
        }}>
          Press Enter for AI search
        </div>
      )}
    </div>
  );
};

export default SearchBar; 