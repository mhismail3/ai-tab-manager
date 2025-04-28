import React, { useState } from 'react';
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

const Modal = ({ isOpen, onClose, onSave, defaultName }) => {
  const [groupName, setGroupName] = useState(defaultName);
  
  if (!isOpen) return null;
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '20px',
        width: '300px',
        maxWidth: '90%'
      }}>
        <h3 style={{ margin: '0 0 15px 0' }}>Save Tab Group</h3>
        
        <input
          type="text"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          placeholder="Enter group name"
          style={{
            width: '100%',
            padding: '8px 10px',
            borderRadius: '4px',
            border: '1px solid var(--border-color)',
            marginBottom: '15px'
          }}
          autoFocus
        />
        
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 15px',
              borderRadius: '4px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'white',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          
          <button
            onClick={() => onSave(groupName)}
            style={{
              padding: '8px 15px',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: 'var(--primary)',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

const Toast = ({ message, isVisible, type = 'success' }) => {
  if (!isVisible) return null;
  
  const getBgColor = () => {
    switch (type) {
      case 'success': return 'var(--success)';
      case 'error': return 'var(--danger)';
      case 'info': return 'var(--info)';
      default: return 'var(--success)';
    }
  };
  
  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      backgroundColor: getBgColor(),
      color: 'white',
      padding: '10px 15px',
      borderRadius: '4px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
      zIndex: 1000,
      animation: 'fadeIn 0.3s, fadeOut 0.3s 2.7s',
      animationFillMode: 'forwards'
    }}>
      {message}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeOut {
          from { opacity: 1; transform: translateY(0); }
          to { opacity: 0; transform: translateY(20px); }
        }
      `}</style>
    </div>
  );
};

const QuickActions = () => {
  const [isSaveModalOpen, setSaveModalOpen] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  
  const handleOrganize = () => {
    chrome.runtime.sendMessage({ action: 'organizeTabs' });
  };

  const handleSaveTabs = () => {
    // Generate default name with date/time
    const now = new Date();
    const defaultName = `Saved Tabs - ${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    setSaveModalOpen(true);
  };
  
  const handleSaveTabsWithName = (groupName) => {
    chrome.runtime.sendMessage({ 
      action: 'saveTabs', 
      groupName: groupName 
    }, (response) => {
      if (response && response.success) {
        setToast({
          visible: true,
          message: `${response.message || 'Tabs saved successfully!'}`,
          type: 'success'
        });
        
        // Hide toast after 3 seconds
        setTimeout(() => {
          setToast({ ...toast, visible: false });
        }, 3000);
      }
    });
    
    setSaveModalOpen(false);
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
      
      <Modal 
        isOpen={isSaveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        onSave={handleSaveTabsWithName}
        defaultName={`Saved Tabs - ${new Date().toLocaleDateString()}`}
      />
      
      <Toast {...toast} />
    </div>
  );
};

export default QuickActions; 