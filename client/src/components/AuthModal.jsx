// AuthModal component — Tabbed modal for Login, Citizen Register, and Admin Provisioning
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function AuthModal({ isOpen, onClose }) {
  const { login, register, provisionAdmin } = useAuth();
  const [tab, setTab] = useState('login'); // 'login' | 'register' | 'admin'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adminSecret, setAdminSecret] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (tab === 'login') {
        await login(email, password);
      } else if (tab === 'register') {
        await register(email, password);
      } else if (tab === 'admin') {
        await provisionAdmin(email, password, adminSecret);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Welcome to CiviBridge</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="tab-buttons">
          <button
            className={`tab-btn ${tab === 'login' ? 'active' : ''}`}
            onClick={() => { setTab('login'); setError(''); }}
          >
            Sign In
          </button>
          <button
            className={`tab-btn ${tab === 'register' ? 'active' : ''}`}
            onClick={() => { setTab('register'); setError(''); }}
          >
            Register Citizen
          </button>
          <button
            className={`tab-btn ${tab === 'admin' ? 'active' : ''}`}
            onClick={() => { setTab('admin'); setError(''); }}
          >
            Provision Admin
          </button>
        </div>

        {error && <div className="alert-box error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {tab === 'admin' && (
            <div className="form-group">
              <label>Admin Provisioning Secret</label>
              <input
                type="password"
                required
                placeholder="Enter admin secret key"
                value={adminSecret}
                onChange={(e) => setAdminSecret(e.target.value)}
              />
              <span className="form-hint">Required for provisioning department administrator role</span>
            </div>
          )}

          <button type="submit" className="btn-primary btn-full" disabled={submitting}>
            {submitting
              ? 'Processing...'
              : tab === 'login'
              ? 'Sign In'
              : tab === 'register'
              ? 'Create Citizen Account'
              : 'Provision Admin Account'}
          </button>
        </form>
      </div>
    </div>
  );
}
