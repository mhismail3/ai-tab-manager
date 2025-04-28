import React, { useState, useEffect } from 'react';
import { 
  FiCpu, 
  FiGrid, 
  FiSave, 
  FiArchive, 
  FiSettings, 
  FiFile, 
  FiLayers,
  FiTablet,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiArrowLeft
} from 'react-icons/fi';
import TabList from '../components/TabList';

const TabGroupView = () => {
  const [tabGroups, setTabGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [groupColors] = useState([
    { name: 'Red', value: 'red' },
    { name: 'Yellow', value: 'yellow' },
    { name: 'Green', value: 'green' },
    { name: 'Blue', value: 'blue' },
    { name: 'Purple', value: 'purple' },
    { name: 'Pink', value: 'pink' },
    { name: 'Cyan', value: 'cyan' },
    { name: 'Orange', value: 'orange' },
  ]);
  
  useEffect(() => {
    loadTabGroups();
  }, []);
  
  const loadTabGroups = async () => {
    setLoading(true);
    
    try {
      // Check if Chrome has tabGroups API
      if (chrome.tabGroups) {
        // Get all tab groups
        const groups = await new Promise(resolve => {
          chrome.tabGroups.query({}, (tabGroups) => resolve(tabGroups || []));
        });
        
        // For each group, get all tabs in that group
        const groupsWithTabs = await Promise.all(groups.map(async group => {
          const tabs = await new Promise(resolve => {
            chrome.tabs.query({ groupId: group.id }, (tabs) => resolve(tabs));
          });
          
          return {
            ...group,
            tabs
          };
        }));
        
        setTabGroups(groupsWithTabs);
        
        // If there are groups and none is selected, select the first one
        if (groupsWithTabs.length > 0 && !selectedGroup) {
          setSelectedGroup(groupsWithTabs[0]);
        }
      }
    } catch (error) {
      console.error('Error loading tab groups:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleCreateGroup = async () => {
    // Get current active tab
    const tabs = await new Promise(resolve => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => resolve(tabs));
    });
    
    if (tabs.length > 0) {
      const groupId = await new Promise(resolve => {
        chrome.tabs.group({ tabIds: [tabs[0].id] }, (groupId) => resolve(groupId));
      });
      
      chrome.tabGroups.update(groupId, { title: 'New Group' });
      
      // Reload groups
      loadTabGroups();
    }
  };
  
  const handleRenameGroup = async (groupId, newTitle) => {
    await chrome.tabGroups.update(groupId, { title: newTitle });
    loadTabGroups();
  };
  
  const handleChangeColor = async (groupId, color) => {
    await chrome.tabGroups.update(groupId, { color });
    loadTabGroups();
  };
  
  const handleAddTabToGroup = async (groupId) => {
    // Get current active tab
    const tabs = await new Promise(resolve => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => resolve(tabs));
    });
    
    if (tabs.length > 0) {
      await chrome.tabs.group({ tabIds: [tabs[0].id], groupId });
      loadTabGroups();
    }
  };
  
  const handleUngroupTab = async (tabId) => {
    await chrome.tabs.ungroup(tabId);
    loadTabGroups();
  };
  
  const handleDeleteGroup = async (groupId) => {
    // This will ungroup all tabs in the group
    const group = tabGroups.find(g => g.id === groupId);
    if (group) {
      await chrome.tabs.ungroup(group.tabs.map(tab => tab.id));
      
      // If this was the selected group, set selected to null
      if (selectedGroup && selectedGroup.id === groupId) {
        setSelectedGroup(null);
      }
      
      loadTabGroups();
    }
  };
  
  const handleBackToDashboard = () => {
    chrome.tabs.update({ url: chrome.runtime.getURL('dashboard.html') });
  };
  
  const handleGroupClick = (group) => {
    setSelectedGroup(group);
  };
  
  const renderSidebar = () => (
    <aside className="sidebar">
      <div className="sidebar-header">
        <FiLayers size={20} />
        <h1>Tab Groups</h1>
      </div>
      
      <button 
        className="btn btn-primary" 
        style={{ 
          width: '100%', 
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        onClick={handleCreateGroup}
      >
        <FiPlus style={{ marginRight: '6px' }} /> New Group
      </button>
      
      <ul className="nav-menu">
        {tabGroups.map(group => (
          <li 
            key={group.id}
            className={`nav-item ${selectedGroup && selectedGroup.id === group.id ? 'active' : ''}`}
            onClick={() => handleGroupClick(group)}
            style={{
              borderLeft: `3px solid ${group.color || '#ccc'}`
            }}
          >
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              width: '100%'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center'
              }}>
                <FiLayers className="nav-item-icon" />
                {group.title || 'Unnamed group'}
                <span style={{ 
                  marginLeft: '6px', 
                  fontSize: '11px', 
                  opacity: 0.7 
                }}>
                  ({group.tabs.length})
                </span>
              </div>
            </div>
          </li>
        ))}
      </ul>
      
      <div style={{ marginTop: 'auto', padding: '20px 0' }}>
        <button 
          className="btn btn-outline" 
          style={{ 
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onClick={handleBackToDashboard}
        >
          <FiArrowLeft style={{ marginRight: '6px' }} /> Back to Dashboard
        </button>
      </div>
    </aside>
  );
  
  const renderGroupDetails = () => {
    if (!selectedGroup) {
      return (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center',
          height: '60vh',
          color: '#6B7280'
        }}>
          <FiLayers size={64} style={{ marginBottom: '20px', opacity: 0.5 }} />
          <h2>No Group Selected</h2>
          <p>Select a tab group from the sidebar or create a new one.</p>
          
          {tabGroups.length === 0 && (
            <button 
              className="btn btn-primary" 
              style={{ marginTop: '20px' }}
              onClick={handleCreateGroup}
            >
              <FiPlus style={{ marginRight: '6px' }} /> Create Tab Group
            </button>
          )}
        </div>
      );
    }
    
    return (
      <>
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">
                <span 
                  style={{ 
                    display: 'inline-block',
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: selectedGroup.color || '#ccc',
                    marginRight: '8px'
                  }}
                ></span>
                {selectedGroup.title || 'Unnamed group'}
              </h2>
              <div style={{ fontSize: '12px', color: '#6B7280' }}>
                {selectedGroup.tabs.length} tabs
              </div>
            </div>
            
            <div className="card-actions">
              <button 
                className="btn btn-outline" 
                style={{ marginRight: '10px' }}
                onClick={() => {
                  const newTitle = prompt('Enter new group name:', selectedGroup.title);
                  if (newTitle) {
                    handleRenameGroup(selectedGroup.id, newTitle);
                  }
                }}
              >
                <FiEdit2 style={{ marginRight: '6px' }} /> Rename
              </button>
              
              <button 
                className="btn btn-outline" 
                style={{ marginRight: '10px' }}
                onClick={() => handleAddTabToGroup(selectedGroup.id)}
              >
                <FiPlus style={{ marginRight: '6px' }} /> Add Current Tab
              </button>
              
              <button 
                className="btn"
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: '#EF4444',
                  padding: '8px'
                }}
                onClick={() => {
                  if (window.confirm('Are you sure you want to delete this group? The tabs will remain open but ungrouped.')) {
                    handleDeleteGroup(selectedGroup.id);
                  }
                }}
              >
                <FiTrash2 size={18} />
              </button>
            </div>
          </div>
          
          <div style={{ marginTop: '15px', marginBottom: '20px' }}>
            <div style={{ marginBottom: '10px', fontWeight: 500 }}>Group color:</div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {groupColors.map(color => (
                <div 
                  key={color.value}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: color.value,
                    cursor: 'pointer',
                    border: selectedGroup.color === color.value ? '2px solid #333' : '2px solid transparent'
                  }}
                  title={color.name}
                  onClick={() => handleChangeColor(selectedGroup.id, color.value)}
                ></div>
              ))}
            </div>
          </div>
          
          <div style={{ marginTop: '15px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 10px 0' }}>Tabs in this group</h3>
            
            <TabList 
              tabs={selectedGroup.tabs}
              loading={loading}
              showFavIcon={true}
              onClose={(tabId) => {
                // Tab will be closed by the TabList component
                // We just need to refresh the groups
                loadTabGroups();
              }}
              customActions={(tab) => (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUngroupTab(tab.id);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: '5px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    marginLeft: '5px',
                    color: '#6B7280',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                  title="Remove from group"
                >
                  Ungroup
                </button>
              )}
            />
          </div>
        </div>
      </>
    );
  };
  
  return (
    <div className="dashboard">
      {renderSidebar()}
      
      <main className="main-content">
        <div className="page-header">
          <h1 className="page-title">Tab Group Management</h1>
        </div>
        
        {renderGroupDetails()}
      </main>
    </div>
  );
};

export default TabGroupView; 