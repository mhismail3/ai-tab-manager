import React, { useState, useEffect } from 'react';
import { 
  FiLayers,
  FiPlus,
  FiEdit2,
  FiTrash2
} from 'react-icons/fi';
import TabList from './TabList';

const TabGroups = ({ onRefresh }) => {
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
      if (onRefresh) onRefresh();
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
  
  const handleGroupClick = (group) => {
    setSelectedGroup(group);
  };
  
  const renderGroupList = () => (
    <div className="tab-groups-sidebar">
      <button 
        className="btn btn-primary" 
        style={{ 
          width: '100%', 
          marginBottom: '15px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        onClick={handleCreateGroup}
      >
        <FiPlus style={{ marginRight: '6px' }} /> New Group
      </button>
      
      {tabGroups.length === 0 ? (
        <div className="no-groups-message">
          <p>No tab groups found</p>
          <p className="text-muted">Create a new group to get started</p>
        </div>
      ) : (
        <ul className="tab-groups-list">
          {tabGroups.map(group => (
            <li 
              key={group.id}
              className={`tab-group-item ${selectedGroup && selectedGroup.id === group.id ? 'active' : ''}`}
              onClick={() => handleGroupClick(group)}
              style={{
                borderLeft: `3px solid ${group.color || '#ccc'}`
              }}
            >
              <div className="tab-group-content">
                <div className="tab-group-title">
                  <span className="tab-group-icon"><FiLayers size={16} /></span>
                  {group.title || 'Unnamed group'}
                  <span className="tab-group-count">
                    ({group.tabs.length})
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
  
  const renderGroupDetails = () => {
    if (!selectedGroup) {
      return (
        <div className="empty-state">
          <FiLayers size={64} className="empty-state-icon" />
          <h2>No Group Selected</h2>
          <p>Select a tab group from the list or create a new one.</p>
          
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
        <div className="card-header">
          <div>
            <h2 className="card-title">
              <span 
                className="color-dot"
                style={{ backgroundColor: selectedGroup.color || '#ccc' }}
              ></span>
              {selectedGroup.title || 'Unnamed group'}
            </h2>
            <div className="text-muted">
              {selectedGroup.tabs.length} tab{selectedGroup.tabs.length !== 1 ? 's' : ''}
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
              className="btn btn-icon"
              style={{ color: 'var(--danger)' }}
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
        
        <div className="group-color-selector">
          <div className="section-title">Group color:</div>
          <div className="color-options">
            {groupColors.map(color => (
              <div 
                key={color.value}
                className={`color-option ${selectedGroup.color === color.value ? 'active' : ''}`}
                style={{ backgroundColor: color.value }}
                title={color.name}
                onClick={() => handleChangeColor(selectedGroup.id, color.value)}
              ></div>
            ))}
          </div>
        </div>
        
        <div className="tabs-section">
          <h3 className="section-title">Tabs in this group</h3>
          
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
                className="btn-text"
                title="Remove from group"
              >
                Ungroup
              </button>
            )}
          />
        </div>
      </>
    );
  };
  
  return (
    <div className="tab-groups-container">
      <div className="tab-groups-layout">
        <div className="tab-groups-panel">
          {renderGroupList()}
        </div>
        <div className="tab-groups-content">
          {renderGroupDetails()}
        </div>
      </div>
    </div>
  );
};

export default TabGroups; 