import React from 'react';
import { FiX, FiCpu, FiAlertCircle, FiCheck, FiClock } from 'react-icons/fi';

const getSuggestionIcon = (type) => {
  const iconSize = 20;
  switch (type) {
    case 'cleanup':
      return <FiCpu size={iconSize} color="var(--primary)" />;
    case 'warning':
      return <FiAlertCircle size={iconSize} color="var(--warning)" />;
    case 'success':
      return <FiCheck size={iconSize} color="var(--success)" />;
    case 'reminder':
      return <FiClock size={iconSize} color="var(--info)" />;
    default:
      return <FiCpu size={iconSize} color="var(--primary)" />;
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
        
        <div>
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
          
          {action && (
            <button
              onClick={onAction}
              className="btn-primary"
              style={{ 
                padding: '6px 12px',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {getSuggestionIcon(type)} {action}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SuggestionCard; 