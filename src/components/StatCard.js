import React from 'react';

const StatCard = ({ title, value, icon, color, description }) => {
  // Handle display of value, ensure 0 is displayed properly and not overlooked
  const displayValue = value === 0 ? '0' : value;
  
  return (
    <div className="stat-card">
      <div className="stat-header">
        <div 
          className="stat-icon"
          style={{ 
            backgroundColor: color ? `${color}15` : 'rgba(74, 108, 247, 0.1)',
            color: color || 'var(--primary)'
          }}
        >
          {icon}
        </div>
        <h3 className="stat-title">{title}</h3>
      </div>
      
      <div className="stat-value">{displayValue}</div>
      
      {description && (
        <div className="stat-description">{description}</div>
      )}
    </div>
  );
};

export default StatCard; 