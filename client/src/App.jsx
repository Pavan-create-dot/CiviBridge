import React from 'react';

export default function App() {
  return (
    <div className="app-container">
      <main className="hero-card">
        <div className="badge">Phase 1 — Scaffold Active</div>
        <h1 className="hero-title">CiviBridge</h1>
        <p className="hero-subtitle">
          AI-powered Multilingual Regional Language Civic Grievance Assistant supporting English,
          Telugu, and Hindi.
        </p>

        <div className="features-grid">
          <div className="feature-card">
            <h3>Multilingual Assistance</h3>
            <p>Draft and understand civic grievances in native Telugu, Hindi, or English.</p>
          </div>
          <div className="feature-card">
            <h3>Semantic Search (RAG)</h3>
            <p>Powered by vector search and LLM context retrieval over civic policy docs.</p>
          </div>
          <div className="feature-card">
            <h3>Two-Sided Platform</h3>
            <p>
              Empowering citizens to track grievances and department staff to triage efficiently.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
