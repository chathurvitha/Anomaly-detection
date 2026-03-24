import React, { useState, useEffect } from 'react';
import axios from 'axios';

const TrialBalance = ({ token }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    axios.get('http://localhost:5000/api/reports/trial-balance', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => setData(res.data.trial_balance || []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="page-content">Loading Trial Balance...</div>;

  return (
    <div className="page-content">
      <h2>Trial Balance</h2>
      <table className="modern-table">
        <thead>
          <tr>
            <th>Account Code</th>
            <th>Total Debit</th>
            <th>Total Credit</th>
          </tr>
        </thead>
        <tbody>
          {data.map(row => (
            <tr key={row.account_code}>
              <td>{row.account_code}</td>
              <td>{row.total_debit}</td>
              <td>{row.total_credit}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TrialBalance;
