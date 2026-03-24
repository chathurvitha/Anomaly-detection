import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BalanceSheet = ({ token }) => {
  const [data, setData] = useState({ assets: [], liabilities: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    axios.get('http://localhost:5000/api/reports/balance-sheet', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => setData(res.data || { assets: [], liabilities: [] }))
      .catch(() => setData({ assets: [], liabilities: [] }))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="page-content">Loading Balance Sheet...</div>;

  return (
    <div className="page-content">
      <h2>Balance Sheet</h2>
      <div style={{ display: 'flex', gap: '2rem' }}>
        <div>
          <h3>Assets</h3>
          <ul>
            {data.assets.map((a, i) => <li key={i}>{a.name}: {a.amount}</li>)}
          </ul>
        </div>
        <div>
          <h3>Liabilities</h3>
          <ul>
            {data.liabilities.map((l, i) => <li key={i}>{l.name}: {l.amount}</li>)}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default BalanceSheet;
