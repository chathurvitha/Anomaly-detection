import React, { useState, useEffect } from 'react';
import './App.css';
import Login from './pages/Login';
import ModernDashboard from './pages/ModernDashboard';

function App() {
  const [token, setToken] = useState(null);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
      setToken(savedToken);
    }
  }, []);

  if (!token) {
    return <Login setToken={setToken} />;
  }

  return <ModernDashboard token={token} setToken={setToken} />;
}

export default App;