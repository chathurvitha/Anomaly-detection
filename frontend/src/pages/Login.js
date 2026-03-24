import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Login = ({ setToken }) => {
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    // Generate floating particles
    const newParticles = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 5,
      duration: 10 + Math.random() * 10
    }));
    setParticles(newParticles);
  }, []);

  const handleChange = (e) => {
    setCredentials({
      ...credentials,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post('http://localhost:5000/api/login', credentials);
      setToken(response.data.access_token);
    } catch (error) {
      setError(error.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container-animated">
      {/* Animated Background */}
      <div className="animated-bg">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
      </div>

      {/* Floating Particles */}
      <div className="particles">
        {particles.map(particle => (
          <div
            key={particle.id}
            className="particle"
            style={{
              left: `${particle.left}%`,
              animationDelay: `${particle.delay}s`,
              animationDuration: `${particle.duration}s`
            }}
          />
        ))}
      </div>

      {/* Login Card */}
      <div className="login-card-animated">
        <div className="card-glow"></div>
        
        <form className="login-form-animated" onSubmit={handleSubmit}>
          {/* Logo Section */}
          <div className="logo-section-animated">
            <div className="logo-animated">
              <span className="logo-text">FG</span>
              <div className="logo-ring"></div>
            </div>
            <h1 className="brand-title">FinanceGuard Pro</h1>
            <p className="brand-subtitle">Enterprise Financial Anomaly Detection</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="error-animated">
              {error}
            </div>
          )}

          {/* Form Fields */}
          <div className="form-group-animated">
            <label className="form-label-animated">Username</label>
            <div className="input-wrapper">
              <input
                type="text"
                name="username"
                value={credentials.username}
                onChange={handleChange}
                required
                placeholder="Enter your username"
                className="form-input-animated"
              />
            </div>
          </div>

          <div className="form-group-animated">
            <label className="form-label-animated">Password</label>
            <div className="input-wrapper">
              <input
                type="password"
                name="password"
                value={credentials.password}
                onChange={handleChange}
                required
                placeholder="Enter your password"
                className="form-input-animated"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            className="btn-animated" 
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Signing In...
              </>
            ) : (
              <>
                <span>Sign In</span>
                <span className="btn-arrow">→</span>
              </>
            )}
          </button>

          {/* Credentials Info */}
          <div className="credentials-info">
            <div>
              <strong>Default credentials:</strong><br/>
              <code>admin / admin123</code>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;