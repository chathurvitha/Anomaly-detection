import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './ModernDashboard.css';
import Dashboard from './Dashboard';
import Analytics from './Analytics';
import Reports from './Reports';
import CustomerInvoice from './CustomerInvoice';
import Settings from './Settings';

const ModernDashboard = ({ token, setToken }) => {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [stats, setStats] = useState({ total: 0, anomalies: 0, normal: 0 });
  const [totalAmount, setTotalAmount] = useState(0);
  const [monthlyGrowth, setMonthlyGrowth] = useState(0);
  const [entries, setEntries] = useState([]);
  const [allEntries, setAllEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('monthly');

  const fetchData = useCallback(async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/ledger', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const d = res.data;
      const all = d.entries || [];
      setAllEntries(all);
      setStats({
        total: d.total_count,
        anomalies: d.anomaly_count,
        normal: d.total_count - d.anomaly_count
      });
      setEntries(all.slice(0, 5));
      setTotalAmount(d.total_amount || 0);
      setMonthlyGrowth(12.5);
      setLoading(false);
    } catch (error) {
      console.error('Fetch error:', error);
      setLoading(false);
    }
  }, [token]);

  const handleStatsUpdate = useCallback(() => fetchData(), [fetchData]);

  const getViewStats = useCallback(() => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const thisYear = now.getFullYear();
    const thisMonth = now.getMonth() + 1;

    const parseDate = (raw) => {
      if (!raw) return null;
      const s = String(raw).trim();
      if (/^\d{4}-\d{2}-\d{2}/.test(s)) return new Date(s.slice(0, 10));
      if (/^\d{2}[\-\/]\d{2}[\-\/]\d{4}/.test(s)) {
        const [day, mon, yr] = s.split(/[\-\/]/);
        return new Date(`${yr}-${mon}-${day}`);
      }
      return new Date(s);
    };

    if (allEntries.length === 0) {
      return { amount: totalAmount, total: stats.total, anomalies: stats.anomalies, normal: stats.normal, isAllTime: true };
    }

    const filtered = allEntries.filter(e => {
      const d = parseDate(e.date);
      if (!d || isNaN(d)) return false;
      if (viewMode === 'daily') return d.toISOString().split('T')[0] === today;
      return d.getFullYear() === thisYear && (d.getMonth() + 1) === thisMonth;
    });

    const useAll = filtered.length === 0;
    const source = useAll ? allEntries : filtered;
    return {
      amount: useAll ? totalAmount : source.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0),
      total: source.length,
      anomalies: source.filter(e => e.is_anomaly === 1).length,
      normal: source.filter(e => e.is_anomaly !== 1).length,
      isAllTime: useAll,
    };
  }, [allEntries, viewMode, totalAmount, stats]);

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token, fetchData]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('token');
  };

  if (loading) {
    return (
      <div className="modern-loading">
        <div className="modern-loading-text">Loading...</div>
      </div>
    );
  }

  return (
    <div className="modern-dashboard">
      {/* Sidebar */}
      <aside className="modern-sidebar">
        <div className="modern-sidebar-header">
          <div className="modern-logo">
            <span className="modern-logo-icon">FG</span>
            <div>
              <h1 className="modern-logo-text">FinanceGuard</h1>
              <p className="modern-logo-subtitle">Anomaly Detection System</p>
            </div>
          </div>
        </div>

        <nav className="modern-nav">
          <button className={`modern-nav-item ${currentPage === 'dashboard' ? 'active' : ''}`} onClick={() => setCurrentPage('dashboard')}>
            <span className="material-icons nav-icon">dashboard</span>
            <p>Dashboard</p>
          </button>
          <button className={`modern-nav-item ${currentPage === 'transactions' ? 'active' : ''}`} onClick={() => setCurrentPage('transactions')}>
            <span className="material-icons nav-icon">account_balance_wallet</span>
            <p>Transactions</p>
          </button>
          <button className={`modern-nav-item ${currentPage === 'analytics' ? 'active' : ''}`} onClick={() => setCurrentPage('analytics')}>
            <span className="material-icons nav-icon">bar_chart</span>
            <p>Analytics</p>
          </button>
          <button className={`modern-nav-item ${currentPage === 'anomalies' ? 'active' : ''}`} onClick={() => setCurrentPage('anomalies')}>
            <span className="material-icons nav-icon">warning</span>
            <p>Anomalies</p>
          </button>
          <button className={`modern-nav-item ${currentPage === 'customers' ? 'active' : ''}`} onClick={() => setCurrentPage('customers')}>
            <span className="material-icons nav-icon">people</span>
            <p>Customers & Invoice</p>
          </button>
          <button className={`modern-nav-item ${currentPage === 'reports' ? 'active' : ''}`} onClick={() => setCurrentPage('reports')}>
            <span className="material-icons nav-icon">description</span>
            <p>Reports</p>
          </button>

          <div className="modern-nav-divider">Preferences</div>
          <button className={`modern-nav-item ${currentPage === 'settings' ? 'active' : ''}`} onClick={() => setCurrentPage('settings')}>
            <span className="material-icons nav-icon">settings</span>
            <p>Settings</p>
          </button>
          <button className="modern-nav-item">
            <span className="material-icons nav-icon">help</span>
            <p>Help & Support</p>
          </button>
        </nav>

        <div className="modern-sidebar-footer">
          <button onClick={handleLogout} className="modern-logout-btn">
            <span className="material-icons nav-icon">logout</span>
            <p>Log Out</p>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="modern-main">
        {/* Header */}
        <header className="modern-header">
          <div className="modern-header-left">
            <h2 className="modern-header-title">Good Morning, Admin!</h2>
            <span className="modern-badge">System Manager</span>
          </div>
          <div className="modern-header-right">
            <button className="modern-icon-btn">
              <span className="material-icons">chat</span>
              <span className="modern-notification-dot"></span>
            </button>
            <button className="modern-icon-btn">
              <span className="material-icons">notifications</span>
            </button>
            <div className="modern-avatar">A</div>
          </div>
        </header>

        {/* Content */}
        <div className="modern-content">
          {currentPage === 'dashboard' && (
            <div className="modern-grid">
              {/* Dashboard Content */}
              <div className="modern-col-8">
                <div className="modern-glass-card">
                  <div className="modern-card-header">
                    <div>
                      <p className="modern-card-title">
                        {getViewStats().isAllTime ? 'All Time' : viewMode === 'daily' ? "Today's" : "This Month's"} Transaction Value
                      </p>
                      <h3 className="modern-card-value">{formatCurrency(getViewStats().amount)}</h3>
                      <div className="modern-card-growth">
                        <span className="modern-growth-positive">+{monthlyGrowth}%</span>
                        <span className="modern-growth-label">
                          {getViewStats().isAllTime ? 'All loaded data' : viewMode === 'daily' ? 'vs Yesterday' : 'vs Last Month'}
                        </span>
                      </div>
                    </div>
                    <div className="modern-btn-group">
                      <button
                        className={`modern-btn-sm ${viewMode === 'daily' ? 'active' : ''}`}
                        onClick={() => setViewMode('daily')}
                      >Daily</button>
                      <button
                        className={`modern-btn-sm ${viewMode === 'monthly' ? 'active' : ''}`}
                        onClick={() => setViewMode('monthly')}
                      >Monthly</button>
                    </div>
                  </div>
                  <div className="modern-stats-grid">
                    <div className="modern-stat-box">
                      <p className="modern-stat-label">
                        {getViewStats().isAllTime ? 'Total' : viewMode === 'daily' ? "Today's" : "This Month's"} Entries
                      </p>
                      <p className="modern-stat-number">{getViewStats().total}</p>
                    </div>
                    <div className="modern-stat-box success">
                      <p className="modern-stat-label">Normal</p>
                      <p className="modern-stat-number">{getViewStats().normal}</p>
                    </div>
                    <div className="modern-stat-box danger">
                      <p className="modern-stat-label">Anomalies</p>
                      <p className="modern-stat-number">{getViewStats().anomalies}</p>
                    </div>
                  </div>
                </div>
                <div className="modern-glass-card" style={{marginTop: '1.5rem'}}>
                  <div className="modern-card-header">
                    <h4 style={{color: 'white', fontWeight: 700, margin: 0}}>Recent Transactions</h4>
                    <button style={{color: '#8c2bee', fontSize: '0.875rem', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer'}} onClick={() => setCurrentPage('transactions')}>View All</button>
                  </div>
                  <div className="modern-table-container">
                    <table className="modern-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Description</th>
                          <th>Amount</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entries.map((entry) => (
                          <tr key={entry.id}>
                            <td className="modern-table-date">{entry.date}</td>
                            <td className="modern-table-desc">{entry.description}</td>
                            <td className="modern-table-amount">{formatCurrency(entry.amount)}</td>
                            <td>
                              {entry.is_anomaly ? (
                                <span className="modern-status-badge anomaly">Anomaly</span>
                              ) : (
                                <span className="modern-status-badge normal">Normal</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              <div className="modern-col-4">
                <div className="modern-glass-card">
                  <div className="modern-card-header">
                    <h4 style={{color: 'white', fontWeight: 700, margin: 0}}>Detection Status</h4>
                    <span style={{color: '#8c2bee', fontWeight: 700}}>{stats.total > 0 ? ((stats.normal / stats.total) * 100).toFixed(0) : 0}%</span>
                  </div>
                  <div className="modern-progress-container">
                    <div className="modern-progress-bar" style={{width: `${stats.total > 0 ? (stats.normal / stats.total) * 100 : 0}%`}}></div>
                  </div>
                  <div className="modern-info-box">
                    <div className="modern-info-icon">ML</div>
                    <div className="modern-info-text">
                      <h5>ML Model Active</h5>
                      <p>Isolation Forest Algorithm</p>
                    </div>
                  </div>
                </div>
                <div className="modern-alert-card" style={{marginTop: '1.5rem'}}>
                  <div className="modern-alert-content">
                    <h4 className="modern-alert-title">Alert System</h4>
                    <p className="modern-alert-subtitle">Real-time anomaly detection with email notifications.</p>
                    <div style={{marginBottom: '1.5rem'}}>
                      <div className="modern-alert-value">{stats.anomalies}</div>
                      <div className="modern-alert-label">detected</div>
                    </div>
                    <button className="modern-alert-btn" onClick={() => setCurrentPage('anomalies')}>View Anomalies</button>
                  </div>
                </div>
                <div className="modern-glass-card" style={{marginTop: '1.5rem'}}>
                  <h4 style={{color: 'white', fontWeight: 700, marginBottom: '1rem'}}>System Info</h4>
                  <div className="modern-status-list">
                    <div className="modern-status-item">
                      <span className="modern-status-name">Database</span>
                      <span className="modern-status-value">Connected</span>
                    </div>
                    <div className="modern-status-item">
                      <span className="modern-status-name">Email Service</span>
                      <span className="modern-status-value">Active</span>
                    </div>
                    <div className="modern-status-item">
                      <span className="modern-status-name">ML Model</span>
                      <span className="modern-status-value">Trained</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {currentPage === 'transactions' && (
            <div className="modern-page-wrapper">
              <Dashboard token={token} setToken={setToken} entries={allEntries} onRefresh={fetchData} addNotification={() => {}} />
            </div>
          )}
          
          {currentPage === 'analytics' && (
            <div className="modern-page-wrapper">
              <Analytics token={token} />
            </div>
          )}
          
          {currentPage === 'anomalies' && (
            <div className="modern-page-wrapper">
              <Dashboard token={token} setToken={setToken} entries={allEntries} onRefresh={fetchData} addNotification={() => {}} />
            </div>
          )}
          
          {currentPage === 'reports' && (
            <div className="modern-page-wrapper">
              <Reports token={token} setStats={setStats} />
            </div>
          )}
          
          {currentPage === 'customers' && (
            <div className="modern-page-wrapper">
              <CustomerInvoice token={token} />
            </div>
          )}
          
          {currentPage === 'settings' && (
            <div className="modern-page-wrapper">
              <Settings token={token} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ModernDashboard;