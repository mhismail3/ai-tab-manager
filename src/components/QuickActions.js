import React from 'react';
import { 
  FiCpu, 
  FiSave, 
  FiArchive, 
  FiFolder,
  FiPlusSquare
} from 'react-icons/fi';

const ActionButton = ({ icon, label, onClick, color }) => {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'white',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        padding: '8px 0',
        cursor: 'pointer',
        flex: 1,
        minWidth: '70px',
        transition: 'all 0.2s ease',
        color: color || 'var(--text-dark)'
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.backgroundColor = '#f9fafb';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.backgroundColor = 'white';
      }}
    >
      {icon}
      <span style={{
        marginTop: '6px',
        fontSize: '12px',
        textAlign: 'center'
      }}>
        {label}
      </span>
    </button>
  );
};

const QuickActions = () => {
  const handleOrganize = () => {
    chrome.runtime.sendMessage({ action: 'organizeTabs' });
  };

  const handleSaveTabs = () => {
    chrome.runtime.sendMessage({ action: 'saveTabs' });
  };

  const handleArchiveTabs = () => {
    chrome.runtime.sendMessage({ action: 'archiveTabs' });
  };

  const handleManageGroups = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('tabGroupView.html') });
  };

  const handleCreateGroup = () => {
    chrome.runtime.sendMessage({ action: 'createNewGroup' });
  };

  return (
    <div className="quick-actions mt-4">
      <div style={{ marginBottom: '8px' }}>
        <h2 style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>Quick Actions</h2>
      </div>
      <div style={{ 
        display: 'flex', 
        gap: '8px', 
        flexWrap: 'wrap'
      }}>
        <ActionButton 
          icon={<FiCpu size={18} color="var(--primary)" />} 
          label="Organize" 
          onClick={handleOrganize} 
        />
        <ActionButton 
          icon={<FiSave size={18} color="var(--secondary)" />} 
          label="Save All" 
          onClick={handleSaveTabs} 
        />
        <ActionButton 
          icon={<FiArchive size={18} color="var(--accent)" />} 
          label="Archive" 
          onClick={handleArchiveTabs} 
        />
        <ActionButton 
          icon={<FiFolder size={18} color="var(--success)" />} 
          label="Groups" 
          onClick={handleManageGroups} 
        />
      </div>
    </div>
  );
};

export default QuickActions; 