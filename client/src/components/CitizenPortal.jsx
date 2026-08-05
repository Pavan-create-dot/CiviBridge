// CitizenPortal component — Multilingual RAG grievance drafting and status tracking view
import React, { useState, useEffect } from 'react';
import { draftComplaintWithRAG, submitComplaint, getMyComplaints } from '../services/api';

const LANGUAGES = [
  { code: 'en', label: 'English (English)' },
  { code: 'te', label: 'Telugu (తెలుగు)' },
  { code: 'hi', label: 'Hindi (हिंदी)' },
];

export default function CitizenPortal() {
  // RAG Drafting State
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [userPrompt, setUserPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedDraft, setGeneratedDraft] = useState('');
  const [matchedCategories, setMatchedCategories] = useState([]);
  const [draftError, setDraftError] = useState('');

  // Complaint Submission & List State
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState('');
  const [complaints, setComplaints] = useState([]);
  const [loadingComplaints, setLoadingComplaints] = useState(true);

  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    setLoadingComplaints(true);
    try {
      const data = await getMyComplaints();
      setComplaints(data.complaints || []);
    } catch (err) {
      console.error('Failed to fetch complaints:', err);
    } finally {
      setLoadingComplaints(false);
    }
  };

  const handleGenerateRAG = async (e) => {
    e.preventDefault();
    if (!userPrompt.trim()) return;

    setGenerating(true);
    setDraftError('');
    setSubmitSuccess('');

    try {
      const data = await draftComplaintWithRAG(userPrompt, selectedLanguage);
      setGeneratedDraft(data.draft);
      setMatchedCategories(data.matchedCategories || []);
    } catch (err) {
      setDraftError(err.message || 'Failed to generate grievance draft.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmitGrievance = async () => {
    const textToSubmit = generatedDraft || userPrompt;
    if (!textToSubmit.trim()) return;

    setSubmitting(true);
    setDraftError('');
    setSubmitSuccess('');

    try {
      const res = await submitComplaint(textToSubmit, selectedLanguage);
      setSubmitSuccess(`Grievance submitted successfully! Tracking ID: #${res.complaint.id}`);
      setUserPrompt('');
      setGeneratedDraft('');
      setMatchedCategories([]);
      fetchComplaints();
    } catch (err) {
      setDraftError(err.message || 'Failed to submit grievance.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="citizen-portal">
      <div className="portal-header">
        <h1>Citizen Grievance Portal</h1>
        <p className="portal-subtitle">
          Draft formal civic grievance petitions in your preferred regional language using Gemini AI & semantic retrieval, then track resolution progress.
        </p>
      </div>

      <div className="portal-grid">
        {/* Section 1: AI Multilingual Complaint Assistant */}
        <div className="card drafting-card">
          <div className="card-header">
            <div className="icon-title">
              <span className="card-icon">✨</span>
              <h2>AI Multilingual Grievance Assistant</h2>
            </div>
            <span className="badge badge-accent">Phase 7 RAG Enabled</span>
          </div>

          <form onSubmit={handleGenerateRAG} className="draft-form">
            <div className="form-group">
              <label>Select Preferred Regional Language</label>
              <div className="language-selector">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    className={`lang-btn ${selectedLanguage === lang.code ? 'active' : ''}`}
                    onClick={() => setSelectedLanguage(lang.code)}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Describe Your Civic Issue / Initial Notes</label>
              <textarea
                rows="4"
                required
                placeholder="Example: There is a severe pothole near the main market road causing accidents. Stagnant rainwater collects inside it..."
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
              ></textarea>
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="btn-primary"
                disabled={generating || !userPrompt.trim()}
              >
                {generating ? 'Retrieving Context & Drafting...' : 'Generate Formal Petition'}
              </button>
              
              <button
                type="button"
                className="btn-secondary"
                disabled={submitting || !userPrompt.trim()}
                onClick={handleSubmitGrievance}
              >
                Submit Direct Without Draft
              </button>
            </div>
          </form>

          {draftError && <div className="alert-box error mt-3">{draftError}</div>}
          {submitSuccess && <div className="alert-box success mt-3">{submitSuccess}</div>}

          {/* RAG Generated Output Box */}
          {generatedDraft && (
            <div className="rag-output-box">
              <div className="rag-header">
                <h3>Formal Grievance Petition Draft</h3>
                <span className="lang-tag">{selectedLanguage.toUpperCase()}</span>
              </div>

              <div className="rag-content">
                <pre>{generatedDraft}</pre>
              </div>

              {matchedCategories.length > 0 && (
                <div className="matched-categories">
                  <h4>Relevant Civic Categories & Department Matches:</h4>
                  <div className="category-chips">
                    {matchedCategories.map((cat) => (
                      <div key={cat.id} className="category-chip">
                        <span className="cat-name">{cat.categoryName}</span>
                        <span className="dept-name">({cat.department})</span>
                        <span className="score">Match: {(cat.score * 100).toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="rag-actions mt-3">
                <button
                  type="button"
                  className="btn-success btn-full"
                  disabled={submitting}
                  onClick={handleSubmitGrievance}
                >
                  {submitting ? 'Submitting Petition...' : 'Approve & Submit Formal Petition'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Section 2: Grievance Tracker */}
        <div className="card tracker-card">
          <div className="card-header">
            <div className="icon-title">
              <span className="card-icon">📋</span>
              <h2>My Submitted Grievances</h2>
            </div>
            <button className="btn-secondary btn-sm" onClick={fetchComplaints}>
              Refresh List
            </button>
          </div>

          {loadingComplaints ? (
            <div className="loading-spinner">Loading your grievances...</div>
          ) : complaints.length === 0 ? (
            <div className="empty-state">
              <p>No grievances filed yet. Use the assistant on the left to submit your first issue.</p>
            </div>
          ) : (
            <div className="complaint-list">
              {complaints.map((c) => (
                <div key={c.id} className="complaint-item">
                  <div className="complaint-item-header">
                    <div className="item-title">
                      <span className="complaint-id">#{c.id}</span>
                      <span className={`status-badge status-${c.status}`}>{c.status.replace('_', ' ')}</span>
                      <span className={`priority-badge priority-${c.priority}`}>{c.priority} priority</span>
                    </div>
                    <span className="complaint-date">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="complaint-item-body">
                    <p className="raw-text"><strong>Raw Complaint:</strong> {c.rawText}</p>
                    {c.translatedText && (
                      <p className="translated-text"><strong>English Translation:</strong> {c.translatedText}</p>
                    )}

                    <div className="item-meta">
                      <span className="meta-tag">
                        <strong>Language:</strong> {c.detectedLanguage.toUpperCase()}
                      </span>
                      {c.matchedCategory && (
                        <span className="meta-tag">
                          <strong>Category:</strong> {c.matchedCategory.categoryName}
                        </span>
                      )}
                      {c.assignedDepartment && (
                        <span className="meta-tag dept">
                          <strong>Department:</strong> {c.assignedDepartment}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
