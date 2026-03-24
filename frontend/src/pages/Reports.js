import React, { useState } from 'react';
import axios from 'axios';

const Reports = ({ token, setStats }) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedQuarter, setSelectedQuarter] = useState(Math.ceil((new Date().getMonth() + 1) / 3));
  const [currentReport, setCurrentReport] = useState(null);

  const generateQuarterlyReport = async () => {
    setLoading(true);
    try {
      const response = await axios.post('http://localhost:5000/api/reports/quarterly', {
        year: selectedYear,
        quarter: selectedQuarter
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setCurrentReport(response.data);
      setReports(prev => [response.data, ...prev]);
      
      // Update header stats
      if (response.data.summary && setStats) {
        setStats({
          total: response.data.summary.total_entries || 0,
          anomalies: response.data.summary.anomalies || 0,
          normal: (response.data.summary.total_entries || 0) - (response.data.summary.anomalies || 0)
        });
      }
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Error generating report. Please try again.');
    }
    setLoading(false);
  };

  const generateAnnualReport = async () => {
    setLoading(true);
    try {
      const response = await axios.post('http://localhost:5000/api/reports/annual', {
        year: selectedYear
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setCurrentReport(response.data);
      setReports(prev => [response.data, ...prev]);
      
      // Update header stats
      if (response.data.annual_summary && setStats) {
        setStats({
          total: response.data.annual_summary.total_entries || 0,
          anomalies: response.data.annual_summary.anomalies || 0,
          normal: (response.data.annual_summary.total_entries || 0) - (response.data.annual_summary.anomalies || 0)
        });
      }
    } catch (error) {
      console.error('Error generating annual report:', error);
      alert('Error generating annual report. Please try again.');
    }
    setLoading(false);
  };

  const downloadPDF = async (reportData) => {
    try {
      const response = await axios.post('http://localhost:5000/api/reports/export-pdf',
        reportData,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      );

      // Check if response is an error JSON blob
      if (response.data.type === 'application/json') {
        const text = await response.data.text();
        const err = JSON.parse(text);
        alert(err.message || 'PDF export failed');
        return;
      }

      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `compliance_report_${reportData.period || reportData.year}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Error downloading PDF. Please ensure the backend is running and reportlab is installed.');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const getRiskColor = (level) => {
    const colors = {
      'Low': '#10b981',
      'Medium': '#f59e0b', 
      'High': '#ef4444',
      'Critical': '#dc2626'
    };
    return colors[level] || '#6b7280';
  };

  return (
    <div className="page-content">
      {/* Report Generation Controls */}
      <div className="card">
        <h2>Generate Compliance Reports</h2>
        <div className="report-controls">
          <div className="control-group">
            <label>Year:</label>
            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="form-select"
            >
              {[2026, 2025, 2024, 2023, 2022].map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          
          <div className="control-group">
            <label>Quarter:</label>
            <select 
              value={selectedQuarter} 
              onChange={(e) => setSelectedQuarter(parseInt(e.target.value))}
              className="form-select"
            >
              <option value={1}>Q1 (Jan-Mar)</option>
              <option value={2}>Q2 (Apr-Jun)</option>
              <option value={3}>Q3 (Jul-Sep)</option>
              <option value={4}>Q4 (Oct-Dec)</option>
            </select>
          </div>
          
          <div className="control-buttons">
            <button 
              onClick={generateQuarterlyReport} 
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? 'Generating...' : 'Generate Quarterly Report'}
            </button>
            <button 
              onClick={generateAnnualReport} 
              disabled={loading}
              className="btn btn-secondary"
            >
              {loading ? 'Generating...' : 'Generate Annual Report'}
            </button>
          </div>
        </div>
      </div>

      {/* Current Report Display */}
      {currentReport && (
        <div className="card">
          <div className="report-header">
            <h2>{currentReport.quarter || `Annual Report ${currentReport.year}`}</h2>
            <button 
              onClick={() => downloadPDF(currentReport)}
              className="btn btn-download"
            >
              Download PDF
            </button>
          </div>

          {/* Executive Summary */}
          {currentReport.summary && (
            <div className="report-section">
              <h3>Executive Summary</h3>
              <div className="summary-grid">
                <div className="summary-card">
                  <div className="summary-content">
                    <div className="summary-value">{currentReport.summary.total_entries}</div>
                    <div className="summary-label">Total Entries</div>
                  </div>
                </div>
                
                <div className="summary-card">
                  <div className="summary-content">
                    <div className="summary-value">{currentReport.summary.anomalies}</div>
                    <div className="summary-label">Anomalies</div>
                  </div>
                </div>
                
                <div className="summary-card">
                  <div className="summary-content">
                    <div className="summary-value">{currentReport.summary.anomaly_rate}%</div>
                    <div className="summary-label">Anomaly Rate</div>
                  </div>
                </div>
                
                <div className="summary-card">
                  <div className="summary-content">
                    <div className="summary-value">{formatCurrency(currentReport.summary.total_amount)}</div>
                    <div className="summary-label">Total Amount</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Risk Assessment */}
          {currentReport.risk_assessment && (
            <div className="report-section">
              <h3>Risk Assessment</h3>
              <div className="risk-assessment">
                <div className="risk-indicator">
                  <div 
                    className="risk-level"
                    style={{ backgroundColor: getRiskColor(currentReport.risk_assessment.level) }}
                  >
                    {currentReport.risk_assessment.level}
                  </div>
                  <div className="risk-action">
                    {currentReport.risk_assessment.action}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Compliance Status */}
          {currentReport.compliance_status && (
            <div className="report-section">
              <h3>Compliance Status</h3>
              <div className="compliance-status">
                <div className="compliance-score">
                  <div className="score-circle">
                    <span className="score-value">{currentReport.compliance_status.score}%</span>
                  </div>
                  <div className="score-label">
                    {currentReport.compliance_status.status}
                  </div>
                </div>
                
                <div className="compliance-checks">
                  {Object.entries(currentReport.compliance_status.checks).map(([check, passed]) => (
                    <div key={check} className={`check-item ${passed ? 'passed' : 'failed'}`}>
                      <span className="check-icon">{passed ? 'OK' : 'FAIL'}</span>
                      <span className="check-label">{check.replace(/_/g, ' ').toUpperCase()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Top Anomalies */}
          {currentReport.top_anomalies && currentReport.top_anomalies.length > 0 && (
            <div className="report-section">
              <h3>Top Anomalies</h3>
              <div className="anomalies-table">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Description</th>
                      <th>Amount</th>
                      <th>Category</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentReport.top_anomalies.slice(0, 5).map((anomaly, index) => (
                      <tr key={index}>
                        <td>{new Date(anomaly.date).toLocaleDateString('en-IN')}</td>
                        <td>{anomaly.description}</td>
                        <td className="amount-cell">{formatCurrency(anomaly.amount)}</td>
                        <td>{anomaly.category}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Annual Summary for Annual Reports */}
          {currentReport.annual_summary && (
            <div className="report-section">
              <h3>Annual Overview</h3>
              <div className="annual-stats">
                <div className="stat-item">
                  <span className="stat-label">Total Entries:</span>
                  <span className="stat-value">{currentReport.annual_summary.total_entries}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Total Anomalies:</span>
                  <span className="stat-value">{currentReport.annual_summary.anomalies}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Annual Anomaly Rate:</span>
                  <span className="stat-value">{currentReport.annual_summary.anomaly_rate}%</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Total Amount:</span>
                  <span className="stat-value">{formatCurrency(currentReport.annual_summary.total_amount)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Report History */}
      <div className="card">
        <h2>Report History</h2>
        {reports.length > 0 ? (
          <div className="report-history">
            {reports.map((report, index) => (
              <div key={index} className="history-item">
                <div className="history-info">
                  <div className="history-title">
                    {report.quarter || `Annual Report ${report.year}`}
                  </div>
                  <div className="history-date">
                    Generated: {new Date(report.generated_at).toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="history-actions">
                  <button 
                    onClick={() => setCurrentReport(report)}
                    className="btn btn-sm"
                  >
                    View
                  </button>
                  <button 
                    onClick={() => downloadPDF(report)}
                    className="btn btn-sm btn-secondary"
                  >
                    PDF
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p>No reports generated yet. Generate your first report above.</p>
        )}
      </div>
    </div>
  );
};

export default Reports;