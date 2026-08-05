// App component — Main React SPA wrapper for CiviBridge
import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import AuthModal from './components/AuthModal';
import CitizenPortal from './components/CitizenPortal';
import AdminDashboard from './components/AdminDashboard';

function MainApp() {
  const { user, isAuthenticated, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('citizen'); // 'citizen' | 'admin'
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  return (
    <div className="app-layout">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
      />

      <main className="main-content">
        {!isAuthenticated ? (
          <div className="hero-landing">
            <div className="hero-badge">Phase 9 — React Core UI Ready</div>
            <h1 className="hero-title">CiviBridge Regional AI</h1>
            <p className="hero-subtitle">
              Empowering citizens to articulate, draft, and track civic grievances in regional languages (Telugu, Hindi, English) with Gemini AI & Retrieval-Augmented Generation (RAG).
            </p>

            <div className="hero-cta-box">
              <button
                className="btn-primary btn-lg"
                onClick={() => setIsAuthModalOpen(true)}
              >
                Get Started / Sign In
              </button>
            </div>

            <div className="hero-features-grid">
              <div className="feature-card">
                <div className="feature-icon">🌐</div>
                <h3>Multilingual Translation</h3>
                <p>
                  Translate grievance complaints across Telugu, Hindi, and English seamlessly with Gemini AI models.
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">🧠</div>
                <h3>RAG Semantic Retrieval</h3>
                <p>
                  Vector search over PostgreSQL categories automatically matches grievance issues with the right municipal department.
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">⚡</div>
                <h3>Department Triage Portal</h3>
                <p>
                  Department administrators get analytics, priority routing, action logs, and automated RAG triaging tools.
                </p>
              </div>
            </div>
          </div>
        ) : activeTab === 'admin' && isAdmin ? (
          <AdminDashboard />
        ) : (
          <CitizenPortal />
        )}
      </main>

      <footer className="footer">
        <div className="footer-content">
          <p>© 2026 CiviBridge — AI-powered Regional Language Civic Grievance Assistant</p>
          <span className="footer-tag">Built with React, Node.js Express, Prisma PostgreSQL & Gemini RAG</span>
        </div>
      </footer>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
