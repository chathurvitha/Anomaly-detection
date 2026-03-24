import React, { useState } from 'react';

const Settings = ({ token }) => {
  const [activeTab, setActiveTab] = useState('profile');
  const [saved, setSaved] = useState(false);
  const [profile, setProfile] = useState({ name: 'Admin', email: 'admin@financeguard.com', role: 'System Administrator' });
  const [emailConfig, setEmailConfig] = useState({ senderEmail: '', senderPassword: '', authorityEmail: '', enableAlerts: true });
  const [security, setSecurity] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [system, setSystem] = useState({ anomalyThreshold: 800000, enableML: true, enableEmailAlerts: true, dataRetention: 90 });

  const showSaved = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  const cardStyle = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '2rem', marginBottom: '1.5rem' };
  const inputStyle = { width: '100%', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'white', fontSize: '1rem', boxSizing: 'border-box' };
  const labelStyle = { display: 'block', color: 'rgba(255,255,255,0.7)', marginBottom: '0.5rem', fontWeight: 500 };
  const btnPrimary = { background: 'linear-gradient(135deg, #8c2bee, #b347d9)', color: 'white', border: 'none', padding: '0.75rem 2rem', borderRadius: 8, cursor: 'pointer', fontWeight: 600 };

  const tabs = ['profile', 'email', 'security', 'system'];

  return (
    <div style={{ color: 'white' }}>
      <h3 style={{ marginTop: 0, marginBottom: '1.5rem' }}>Settings</h3>

      {saved && (
        <div style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', padding: '0.75rem 1.5rem', borderRadius: 8, marginBottom: '1.5rem', fontWeight: 500 }}>
          Settings saved successfully.
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: '0.75rem 1.5rem', borderRadius: 8, cursor: 'pointer', fontWeight: 600, border: 'none',
            background: activeTab === tab ? 'linear-gradient(135deg, #8c2bee, #b347d9)' : 'rgba(255,255,255,0.05)',
            color: activeTab === tab ? 'white' : 'rgba(255,255,255,0.7)'
          }}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div style={cardStyle}>
          <h4 style={{ marginTop: 0, marginBottom: '1.5rem' }}>Profile Information</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            {[['name', 'Full Name', 'text'], ['email', 'Email Address', 'email'], ['role', 'Role', 'text']].map(([field, label, type]) => (
              <div key={field}>
                <label style={labelStyle}>{label}</label>
                <input type={type} style={inputStyle} value={profile[field]} onChange={e => setProfile(p => ({ ...p, [field]: e.target.value }))} />
              </div>
            ))}
          </div>
          <button style={btnPrimary} onClick={showSaved}>Save Profile</button>
        </div>
      )}

      {/* Email Tab */}
      {activeTab === 'email' && (
        <div style={cardStyle}>
          <h4 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Email Configuration</h4>
          <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>Configure Gmail SMTP for anomaly alert notifications.</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            {[['senderEmail', 'Sender Gmail Address', 'email'], ['senderPassword', 'Gmail App Password', 'password'], ['authorityEmail', 'Authority Email (Recipient)', 'email']].map(([field, label, type]) => (
              <div key={field}>
                <label style={labelStyle}>{label}</label>
                <input type={type} style={inputStyle} value={emailConfig[field]} onChange={e => setEmailConfig(p => ({ ...p, [field]: e.target.value }))} placeholder={label} />
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <label style={{ ...labelStyle, margin: 0 }}>Enable Email Alerts</label>
              <div onClick={() => setEmailConfig(p => ({ ...p, enableAlerts: !p.enableAlerts }))} style={{ width: 48, height: 24, background: emailConfig.enableAlerts ? '#8c2bee' : 'rgba(255,255,255,0.1)', borderRadius: 12, cursor: 'pointer', position: 'relative', transition: 'background 0.3s' }}>
                <div style={{ position: 'absolute', top: 2, left: emailConfig.enableAlerts ? 26 : 2, width: 20, height: 20, background: 'white', borderRadius: '50%', transition: 'left 0.3s' }} />
              </div>
            </div>
          </div>
          <button style={btnPrimary} onClick={showSaved}>Save Email Settings</button>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div style={cardStyle}>
          <h4 style={{ marginTop: 0, marginBottom: '1.5rem' }}>Change Password</h4>
          <div style={{ maxWidth: 400, display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.5rem' }}>
            {[['currentPassword', 'Current Password'], ['newPassword', 'New Password'], ['confirmPassword', 'Confirm New Password']].map(([field, label]) => (
              <div key={field}>
                <label style={labelStyle}>{label}</label>
                <input type="password" style={inputStyle} value={security[field]} onChange={e => setSecurity(p => ({ ...p, [field]: e.target.value }))} placeholder="••••••••" />
              </div>
            ))}
          </div>
          <button style={btnPrimary} onClick={() => { setSecurity({ currentPassword: '', newPassword: '', confirmPassword: '' }); showSaved(); }}>Update Password</button>
        </div>
      )}

      {/* System Tab */}
      {activeTab === 'system' && (
        <div style={cardStyle}>
          <h4 style={{ marginTop: 0, marginBottom: '1.5rem' }}>System Configuration</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={labelStyle}>Anomaly Threshold (₹)</label>
              <input type="number" style={inputStyle} value={system.anomalyThreshold} onChange={e => setSystem(p => ({ ...p, anomalyThreshold: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>Data Retention (days)</label>
              <input type="number" style={inputStyle} value={system.dataRetention} onChange={e => setSystem(p => ({ ...p, dataRetention: e.target.value }))} />
            </div>
            {[['enableML', 'Enable ML Detection'], ['enableEmailAlerts', 'Enable Email Alerts']].map(([field, label]) => (
              <div key={field} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <label style={{ ...labelStyle, margin: 0 }}>{label}</label>
                <div onClick={() => setSystem(p => ({ ...p, [field]: !p[field] }))} style={{ width: 48, height: 24, background: system[field] ? '#8c2bee' : 'rgba(255,255,255,0.1)', borderRadius: 12, cursor: 'pointer', position: 'relative', transition: 'background 0.3s' }}>
                  <div style={{ position: 'absolute', top: 2, left: system[field] ? 26 : 2, width: 20, height: 20, background: 'white', borderRadius: '50%', transition: 'left 0.3s' }} />
                </div>
              </div>
            ))}
          </div>
          <button style={btnPrimary} onClick={showSaved}>Save System Settings</button>
        </div>
      )}
    </div>
  );
};

export default Settings;
