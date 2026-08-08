// Navbar component — Meridian Light Theme navigation bar
import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ activeTab, setActiveTab, onOpenAuthModal }) {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();

  return (
    <header className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <div className="brand-logo">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path>
              <line x1="4" y1="22" x2="4" y2="15"></line>
            </svg>
          </div>
          <div className="brand-text">
            <span className="brand-title">CiviBridge</span>
            <span className="brand-badge">Regional AI</span>
          </div>
        </div>

        <nav className="navbar-nav">
          {isAuthenticated && (
            <>
              <button
                className={`nav-link ${activeTab === 'citizen' ? 'active' : ''}`}
                onClick={() => setActiveTab('citizen')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                Citizen Portal
              </button>

              {isAdmin && (
                <button
                  className={`nav-link ${activeTab === 'admin' ? 'active' : ''}`}
                  onClick={() => setActiveTab('admin')}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7"></rect>
                    <rect x="14" y="3" width="7" height="7"></rect>
                    <rect x="14" y="14" width="7" height="7"></rect>
                    <rect x="3" y="14" width="7" height="7"></rect>
                  </svg>
                  Admin Triage Portal
                </button>
              )}
            </>
          )}
        </nav>

        <div className="navbar-actions">
          {isAuthenticated ? (
            <div className="user-profile">
              <div className="user-info">
                <span className="user-email">{user.email}</span>
                <span className={`role-pill ${user.role}`}>{user.role}</span>
              </div>
              <button className="btn-secondary btn-sm" onClick={logout}>
                Logout
              </button>
            </div>
          ) : (
            <button className="btn-primary btn-sm" onClick={onOpenAuthModal}>
              Sign In / Register
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
