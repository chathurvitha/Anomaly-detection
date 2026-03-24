import React, { useState } from 'react';
import axios from 'axios';

const Dashboard = ({ token, setToken, setStats, addNotification, entries = [], onRefresh }) => {
  const [ledgerData, setLedgerData] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    amount: '',
    category: 'expense'
  });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showAnomaliesOnly, setShowAnomaliesOnly] = useState(false);
  const entriesPerPage = 10;

  const localStats = {
    total: entries.length,
    anomalies: entries.filter(e => e.is_anomaly === 1).length,
    normal: entries.filter(e => e.is_anomaly !== 1).length,
  };

  const refresh = async () => {
    if (onRefresh) await onRefresh();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await axios.post('http://localhost:5000/api/ledger', ledgerData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.is_anomaly) {
        const alertMessage = `ANOMALY DETECTED! Entry ID ${response.data.entry_id} - Amount: ₹${parseFloat(ledgerData.amount).toLocaleString('en-IN')}`;
        setMessage({
          type: 'anomaly',
          text: `${alertMessage}. Authority has been notified via email.`
        });
        // Add to header notifications
        if (addNotification) {
          addNotification(alertMessage, 'anomaly');
        }
      } else {
        setMessage({
          type: 'success',
          text: `Transaction recorded successfully with ID ${response.data.entry_id}`
        });
        if (addNotification) {
          addNotification(`New transaction added - ₹${parseFloat(ledgerData.amount).toLocaleString('en-IN')}`, 'success');
        }
      }

      // Reset form
      setLedgerData({
        date: new Date().toISOString().split('T')[0],
        description: '',
        amount: '',
        category: 'expense'
      });

      await refresh();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Submission failed'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLoadDefaultCSV = async () => {
    setLoading(true);
    setMessage('');
    try {
      const response = await axios.post('http://localhost:5000/api/load-default-csv', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage({
        type: response.data.anomaly_count > 0 ? 'anomaly' : 'success',
        text: `Loaded ${response.data.added_count} entries. ${response.data.anomaly_count} anomalies detected and authorities notified.`
      });
      await refresh();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to load default CSV' });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      setMessage({ type: 'error', text: 'Please select a file' });
      return;
    }

    setLoading(true);
    setMessage('');

    const formData = new FormData();
    formData.append('file', uploadFile);

    try {
      const response = await axios.post('http://localhost:5000/api/upload-csv', formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.anomaly_count > 0) {
        const alertMessage = `${response.data.anomaly_count} anomalies detected in bulk upload!`;
        setMessage({
          type: 'anomaly',
          text: `File processed! ${response.data.anomaly_count} anomalies detected out of ${response.data.added_count} entries. Authorities notified.`
        });
        if (addNotification) {
          addNotification(alertMessage, 'anomaly');
        }
      } else {
        setMessage({
          type: 'success',
          text: `File processed successfully! ${response.data.added_count} entries added, no anomalies detected.`
        });
        if (addNotification) {
          addNotification(`Bulk upload completed - ${response.data.added_count} entries`, 'success');
        }
      }

      setUploadFile(null);
      document.getElementById('fileInput').value = '';
      await refresh();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Upload failed'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setLedgerData({
      ...ledgerData,
      [e.target.name]: e.target.value
    });
  };

  const handleReset = async () => {
    if (!window.confirm('Are you sure you want to clear all transactions? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    try {
      await axios.delete('http://localhost:5000/api/ledger/reset', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage({
        type: 'success',
        text: 'All transactions cleared successfully!'
      });
      
      await refresh();
      setCurrentPage(1);
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Failed to reset transactions'
      });
    } finally {
      setLoading(false);
    }
  };

  const exportPDF = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/export-pdf', {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      if (response.data.type === 'application/json') {
        const text = await response.data.text();
        const err = JSON.parse(text);
        setMessage({ type: 'error', text: err.message || 'PDF export failed' });
        return;
      }

      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `transaction_report_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setMessage({ type: 'success', text: 'PDF downloaded successfully!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'PDF export failed. Ensure reportlab is installed on the backend.' });
    }
  };

  return (
    <div className="page-content">
      {/* Message Display */}
      {message && (
        <div className={message.type === 'anomaly' ? 'anomaly-alert' : 
                       message.type === 'success' ? 'success-message' : 'error'}>
          {message.text}
        </div>
      )}

      {/* Enhanced Security Overview Cards */}
      <div className="stats-grid">
        <div className="stat-card" style={{
          background: 'linear-gradient(135deg, #2d1b4e 0%, #1a0d2e 100%)',
          border: '1px solid rgba(140,43,238,0.4)',
          boxShadow: '0 0 30px rgba(140,43,238,0.2)',
          color: 'white'
        }}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 2}}>
            <div className="stat-content">
              <h3 style={{color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', marginBottom: '0.5rem'}}>Security Status</h3>
              <div className="stat-number" style={{color: 'white', fontSize: '1.75rem'}}>
                {localStats.anomalies > 0 ? 'ALERT' : 'SECURE'}
              </div>
              <p style={{fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginTop: '0.5rem'}}>System Monitoring Active</p>
            </div>
          </div>
        </div>
        
        <div className="stat-card" style={{background: 'linear-gradient(135deg, #8c2bee 0%, #b347d9 100%)', color: 'white', border: 'none'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
            <div className="stat-content">
              <h3 style={{color: 'rgba(255,255,255,0.9)', fontSize: '0.875rem', marginBottom: '0.5rem'}}>Total Transactions</h3>
              <div className="stat-number" style={{color: 'white', fontSize: '2.5rem'}}>{localStats.total}</div>
              <p style={{fontSize: '0.75rem', opacity: 0.8, marginTop: '0.5rem'}}>All Records</p>
            </div>
          </div>
        </div>
        
        <div className="stat-card anomaly" style={{background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: 'white', border: 'none'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
            <div className="stat-content">
              <h3 style={{color: 'rgba(255,255,255,0.9)', fontSize: '0.875rem', marginBottom: '0.5rem'}}>Security Alerts</h3>
              <div className="stat-number" style={{color: 'white', fontSize: '2.5rem'}}>{localStats.anomalies}</div>
              <p style={{fontSize: '0.75rem', opacity: 0.8, marginTop: '0.5rem'}}>Requires Attention</p>
            </div>
          </div>
        </div>
        
        <div className="stat-card success" style={{background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', border: 'none'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
            <div className="stat-content">
              <h3 style={{color: 'rgba(255,255,255,0.9)', fontSize: '0.875rem', marginBottom: '0.5rem'}}>Verified Safe</h3>
              <div className="stat-number" style={{color: 'white', fontSize: '2.5rem'}}>{localStats.normal}</div>
              <p style={{fontSize: '0.75rem', opacity: 0.8, marginTop: '0.5rem'}}>Compliant Transactions</p>
            </div>
          </div>
        </div>
      </div>

      {/* File Upload Card */}
        <div className="card">
        <div className="card-header">
          <h2>Bulk Transaction Upload</h2>
        </div>
        <div className="card-body">
          <form onSubmit={handleFileUpload}>
            <div className="form-group">
              <label>Select CSV File</label>
              <input
                id="fileInput"
                type="file"
                accept=".csv"
                onChange={(e) => setUploadFile(e.target.files[0])}
                required
                className="form-input"
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Processing...' : 'Upload & Analyze'}
            </button>
          </form>
          <div className="help-text">
            <strong>Required columns:</strong> date, description, amount, category
          </div>
          <div style={{marginTop: '1rem', padding: '0.75rem', background: 'rgba(140,43,238,0.1)', borderRadius: '8px', border: '1px solid rgba(140,43,238,0.3)'}}>
            <p style={{margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)'}}>Or load the pre-built financial ledger with anomalies directly from the server:</p>
            <button
              type="button"
              onClick={handleLoadDefaultCSV}
              disabled={loading}
              className="btn btn-primary"
              style={{background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)'}}
            >
              {loading ? 'Loading...' : 'Load Default Ledger (updated_financial_ledger_with_anomalies.csv)'}
            </button>
          </div>
        </div>
      </div>

      {/* Manual Entry Card */}
      <div className="card">
        <div className="card-header">
          <h2>Manual Transaction Entry</h2>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label>Date</label>
                <input
                  type="date"
                  name="date"
                  value={ledgerData.date}
                  onChange={handleChange}
                  required
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Category</label>
                <select
                  name="category"
                  value={ledgerData.category}
                  onChange={handleChange}
                  required
                  className="form-select"
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                  <option value="transfer">Transfer</option>
                  <option value="investment">Investment</option>
                  <option value="loan">Loan</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  name="amount"
                  value={ledgerData.amount}
                  onChange={handleChange}
                  required
                  placeholder="Enter amount in rupees"
                  className="form-input"
                />
              </div>
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                name="description"
                value={ledgerData.description}
                onChange={handleChange}
                required
                placeholder="Enter detailed transaction description..."
                className="form-textarea"
                rows="3"
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Processing...' : 'Submit Transaction'}
            </button>
          </form>
        </div>
      </div>

      {/* Entries Table Card */}
      <div className="card">
        <div className="card-header">
          <h2>Transaction Monitor</h2>
          <div className="card-actions">
            <button 
              onClick={() => setShowAnomaliesOnly(!showAnomaliesOnly)} 
              className={showAnomaliesOnly ? "btn btn-danger" : "btn btn-outline"}
            >
              {showAnomaliesOnly ? 'Showing Anomalies Only' : 'Show All Transactions'}
            </button>
            <button 
              onClick={handleReset} 
              className="btn"
              style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: 'white'
              }}
            >
              Reset Table
            </button>
            <button onClick={exportPDF} className="btn btn-secondary">
              Export PDF
            </button>
          </div>
        </div>
        
        <div className="card-body">
          {entries.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.4)' }}>
              <p>No transactions found. Start by adding your first transaction!</p>
            </div>
          ) : (
            <>
              <div className="table-container">
                <table className="entries-table">
                  <thead>
                    <tr>
                      <th style={{width: '100px'}}>Date</th>
                      <th style={{minWidth: '200px'}}>Description</th>
                      <th style={{width: '120px'}}>Amount</th>
                      <th style={{width: '100px'}}>Category</th>
                      <th style={{width: '100px'}}>Security Status</th>
                      <th style={{width: '140px'}}>Recorded</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const filteredEntries = showAnomaliesOnly 
                        ? entries.filter(entry => entry.is_anomaly === 1)
                        : entries;
                      const startIndex = (currentPage - 1) * entriesPerPage;
                      const endIndex = startIndex + entriesPerPage;
                      return filteredEntries.slice(startIndex, endIndex);
                    })().map((entry) => (
                      <tr key={entry.id} className={entry.is_anomaly ? 'anomaly-row' : ''}>
                        <td>{entry.date}</td>
                        <td>{entry.description}</td>
                        <td>₹{parseFloat(entry.amount).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                        <td style={{ textTransform: 'capitalize' }}>
                          {entry.category}
                        </td>
                        <td>
                          {entry.is_anomaly ? (
                            <span className="anomaly-badge">ALERT</span>
                          ) : (
                            <span className="normal-badge">SAFE</span>
                          )}
                        </td>
                        <td>{new Date(entry.created_at).toLocaleString('en-IN', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Navigation Controls - Always show when there are entries */}
              {(() => {
                const filteredEntries = showAnomaliesOnly 
                  ? entries.filter(entry => entry.is_anomaly === 1)
                  : entries;
                return filteredEntries.length > entriesPerPage && (
                  <div className="pagination">
                    <div className="pagination-info">
                      Showing {((currentPage - 1) * entriesPerPage) + 1} to {Math.min(currentPage * entriesPerPage, filteredEntries.length)} of {filteredEntries.length} {showAnomaliesOnly ? 'anomalies' : 'transactions'}
                    </div>
                    <div className="pagination-controls">
                      <button 
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="pagination-btn"
                      >
                        ← Previous
                      </button>
                      <span className="page-info">
                        Page {currentPage} of {Math.ceil(filteredEntries.length / entriesPerPage)}
                      </span>
                      <button 
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredEntries.length / entriesPerPage)))}
                        disabled={currentPage >= Math.ceil(filteredEntries.length / entriesPerPage)}
                        className="pagination-btn"
                      >
                        Next →
                      </button>
                    </div>
                  </div>
                );
              })()}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;