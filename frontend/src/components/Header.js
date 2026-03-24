import React from 'react';

const Header = ({ currentPage, stats, setCurrentPage }) => {
  const getPageTitle = () => {
    switch(currentPage) {
      case 'dashboard': return 'Financial Control Center';
      case 'analytics': return 'Analytics & Insights';
      case 'reports': return 'Compliance Reports';
      case 'settings': return 'System Settings';
      default: return 'Dashboard';
    }
  };

  const getPageSubtitle = () => {
    switch(currentPage) {
      case 'dashboard': return 'Real-time anomaly detection and transaction monitoring';
      case 'analytics': return 'Advanced financial analytics and trend analysis';
      case 'reports': return 'Generate compliance and audit reports';
      case 'settings': return 'Configure system preferences and security';
      default: return 'Overview';
    }
  };

  return (
    <div className="page-header">
      <div className="header-content">
        <div className="page-info">
          <div className="breadcrumb">
            <span className="breadcrumb-item">FinanceGuard Pro</span>
            <span className="breadcrumb-separator">›</span>
            <span className="breadcrumb-item active">{getPageTitle()}</span>
          </div>
          <h1 className="page-title">{getPageTitle()}</h1>
          <p className="page-subtitle">{getPageSubtitle()}</p>
        </div>
        
        <div className="header-actions">
          <div className="quick-stats">
            <div className="quick-stat">
              <span className="stat-value">{stats?.total || 0}</span>
              <span className="stat-label">Total</span>
            </div>
            <div className="quick-stat anomaly">
              <span className="stat-value">{stats?.anomalies || 0}</span>
              <span className="stat-label">Alerts</span>
            </div>
          </div>
          
          <div className="header-buttons">
            <button className="header-btn" onClick={() => alert(`You have ${stats?.anomalies || 0} anomaly alerts!`)}>
              <span className="notification-badge">{stats?.anomalies || 0}</span>
            </button>
            <button className="header-btn" onClick={() => setCurrentPage('analytics')}>
            </button>
            <button className="header-btn" onClick={() => alert('Settings - Coming soon!')}>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;