import React from 'react';
import { FiClock, FiExternalLink, FiTrash2, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { format } from 'date-fns';
import { deleteTabGroup } from '../models/tabStorage';

const SavedTabGroups = ({ groups, loading, onDelete }) => {
  const [expandedGroups, setExpandedGroups] = React.useState({});

  const toggleGroup = (groupId) => {
    setExpandedGroups({
      ...expandedGroups,
      [groupId]: !expandedGroups[groupId],
    });
  };

  const handleDeleteGroup = async (groupId) => {
    if (window.confirm('Are you sure you want to delete this group?')) {
      await deleteTabGroup(groupId);
      if (onDelete) {
        onDelete();
      }
    }
  };

  const handleOpenAllTabs = (tabs) => {
    if (tabs && tabs.length > 0) {
      tabs.forEach((tab) => {
        chrome.tabs.create({ url: tab.url, active: false });
      });
    }
  };

  const handleOpenTab = (tab) => {
    chrome.tabs.create({ url: tab.url });
  };

  if (loading) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '30px' }}>
        <div
          className="loading-spinner"
          style={{
            width: '30px',
            height: '30px',
            border: '3px solid rgba(0, 0, 0, 0.1)',
            borderTopColor: 'var(--primary)',
            borderRadius: '50%',
            margin: '0 auto',
            animation: 'spin 1s linear infinite',
          }}
        ></div>
        <p style={{ marginTop: '15px', color: '#6B7280' }}>Loading saved tab groups...</p>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
        <FiClock size={48} style={{ color: '#9CA3AF', marginBottom: '20px' }} />
        <h3 style={{ margin: '0 0 10px', fontSize: '18px' }}>No Saved Groups</h3>
        <p style={{ color: '#6B7280', maxWidth: '400px', margin: '0 auto' }}>
          Save your current tabs by clicking "Save All" or use the Quick Actions in the popup.
        </p>
      </div>
    );
  }

  return (
    <div>
      {groups.map((group) => (
        <div key={group.id} className="card" style={{ marginBottom: '20px' }}>
          <div
            className="card-header"
            style={{ cursor: 'pointer' }}
            onClick={() => toggleGroup(group.id)}
          >
            <div>
              <h2 className="card-title">{group.name}</h2>
              <div style={{ fontSize: '12px', color: '#6B7280' }}>
                {group.tabs.length} tabs • Saved {format(new Date(group.createdAt), 'MMM d, yyyy h:mm a')}
              </div>
            </div>
            <div className="card-actions">
              <button
                className="btn btn-outline"
                style={{ marginRight: '10px' }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenAllTabs(group.tabs);
                }}
              >
                <FiExternalLink style={{ marginRight: '6px' }} /> Open All
              </button>
              <button
                className="btn"
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: '#6B7280',
                  padding: '5px',
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteGroup(group.id);
                }}
              >
                <FiTrash2 size={18} />
              </button>
              {expandedGroups[group.id] ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />}
            </div>
          </div>

          {expandedGroups[group.id] && (
            <div className="card-body" style={{ marginTop: '15px' }}>
              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                  maxHeight: '300px',
                  overflowY: 'auto',
                }}
              >
                {group.tabs.map((tab, index) => (
                  <li
                    key={index}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '8px',
                      borderBottom: index < group.tabs.length - 1 ? '1px solid var(--border-color)' : 'none',
                      cursor: 'pointer',
                    }}
                    onClick={() => handleOpenTab(tab)}
                  >
                    {tab.favIconUrl && (
                      <img
                        src={tab.favIconUrl}
                        alt=""
                        style={{
                          width: '16px',
                          height: '16px',
                          marginRight: '10px',
                          objectFit: 'contain',
                        }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    )}

                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div
                        style={{
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          fontWeight: 500,
                        }}
                      >
                        {tab.title}
                      </div>
                      <div
                        style={{
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          fontSize: '12px',
                          color: '#6B7280',
                        }}
                      >
                        {tab.url}
                      </div>
                    </div>

                    <FiExternalLink
                      size={14}
                      style={{ color: '#6B7280', marginLeft: '5px', flexShrink: 0 }}
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default SavedTabGroups; 