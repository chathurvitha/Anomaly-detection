import React, { useState, useEffect } from 'react';
import axios from 'axios';

const CashFlow = ({ token }) => {
  const [data, setData] = useState({ inflow: 0, outflow: 0, net: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    axios.get('http://localhost:5000/api/reports/cash-flow', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => setData(res.data || { inflow: 0, outflow: 0, net: 0 }))
      .catch(() => setData({ inflow: 0, outflow: 0, net: 0 }))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="page-content">Loading Cash Flow...</div>;

  return (
    <div className="page-content">
      <h2>Cash Flow Statement</h2>
      <div>
        <p><strong>Total Inflow:</strong> {data.inflow}</p>
        <p><strong>Total Outflow:</strong> {data.outflow}</p>
        <p><strong>Net Cash Flow:</strong> {data.net}</p>
      </div>
    </div>
  );
};

export default CashFlow;
