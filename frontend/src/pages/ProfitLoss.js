import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ProfitLoss = ({ token }) => {
  const [data, setData] = useState({ income: 0, expense: 0, net: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    axios.get('http://localhost:5000/api/reports/profit-loss', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => setData(res.data || { income: 0, expense: 0, net: 0 }))
      .catch(() => setData({ income: 0, expense: 0, net: 0 }))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="page-content">Loading Profit & Loss...</div>;

  return (
    <div className="page-content">
      <h2>Profit & Loss Statement</h2>
      <div>
        <p><strong>Total Income:</strong> {data.income}</p>
        <p><strong>Total Expense:</strong> {data.expense}</p>
        <p><strong>Net Profit/Loss:</strong> {data.net}</p>
      </div>
    </div>
  );
};

export default ProfitLoss;
