import React, { useState } from 'react';
import { FiX, FiCpu, FiAlertCircle, FiCheck, FiClock, FiLayers } from 'react-icons/fi';

const getSuggestionIcon = (type) => {
  const iconSize = 20;
  switch (type) {
    case 'cleanup':
      return <FiCpu size={iconSize} />;
    case 'warning':
      return <FiAlertCircle size={iconSize} />;
    case 'success':
      return <FiCheck size={iconSize} />;
    case 'reminder':
      return <FiClock size={iconSize} />;
    default:
      return <FiCpu size={iconSize} />;
  }
};

const getBackground = (type) => {
  switch (type) {
    case 'cleanup':
      return 'rgba(74, 108, 247, 0.1)';
    case 'warning':
      return 'rgba(245, 158, 11, 0.1)';
    case 'success':
      return 'rgba(16, 185, 129, 0.1)';
    case 'reminder':
      return 'rgba(59, 130, 246, 0.1)';
    default:
      return 'rgba(74, 108, 247, 0.1)';
  }
};

const SuggestionCard = ({ suggestion, onAction, onDismiss }) => {
  const { type, message, action } = suggestion;
  const [showRenamePrompt, setShowRenamePrompt] = useState(false);
  const [groupName, setGroupName] = useState(suggestion.defaultGroupName || '');
  
  const handleAction = () => {
    if (action === 'Group These Tabs' && !showRenamePrompt) {
      setShowRenamePrompt(true);
      return;
    }
    
    if (showRenamePrompt) {
      // Call the action handler with the custom group name
      onAction(groupName);
      setShowRenamePrompt(false);
    } else {
      onAction();
    }
  };
  
  return (
    <div 
      className="suggestion-card"
      style={{
        padding: '14px',
        marginTop: '16px',
        marginBottom: '16px',
        borderRadius: '8px',
        backgroundColor: getBackground(type),
        position: 'relative'
      }}
    >
      <button
        onClick={onDismiss}
        style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          background: 'transparent',
          border: 'none',
          borderRadius: '50%',
          width: '20px',
          height: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          cursor: 'pointer',
          color: 'var(--text-dark)',
          opacity: 0.5
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.opacity = 1;
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.opacity = 0.5;
        }}
      >
        <FiX size={16} />
      </button>
      
      <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
        <div style={{ marginTop: '2px' }}>
          {getSuggestionIcon(type)}
        </div>
        
        <div style={{ width: '100%' }}>
          <div 
            className="suggestion-message"
            style={{
              marginRight: '20px',
              marginBottom: '12px',
              fontSize: '13px',
              lineHeight: 1.5
            }}
          >
            {message}
          </div>
          
          {showRenamePrompt && (
            <div style={{ marginBottom: '12px' }}>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Enter group name"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  fontSize: '13px',
                  marginBottom: '8px'
                }}
                autoFocus
              />
            </div>
          )}
          
          {action && (
            <button
              onClick={handleAction}
              className="btn btn-primary"
              style={{ 
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                backgroundColor: 'var(--primary)',
                color: 'white',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
                gap: '6px'
              }}
            >
              {type === 'cleanup' ? <FiLayers size={16} color="white" /> : getSuggestionIcon(type)}
              {showRenamePrompt ? 'Create Group' : action}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SuggestionCard; 