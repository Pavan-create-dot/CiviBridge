// CitizenPortal component — Multilingual RAG grievance drafting, tracking & official petition export
import React, { useState, useEffect } from 'react';
import { draftComplaintWithRAG, submitComplaint, getMyComplaints } from '../services/api';

const LANGUAGES = [
  { code: 'en', label: 'English (English)' },
  { code: 'te', label: 'Telugu (తెలుగు)' },
  { code: 'hi', label: 'Hindi (हिंदी)' },
];

const QUICK_STARTERS = [
  {
    icon: '🕳️',
    label: 'Road Pothole',
    text: 'There is a severe pothole near the main market road causing vehicle damage and traffic hazards. Stagnant rainwater collects inside it.',
  },
  {
    icon: '💡',
    label: 'Broken Streetlight',
    text: 'Streetlights on 4th cross street have not been working for the past week, making the road unsafe for pedestrians at night.',
  },
  {
    icon: '🚰',
    label: 'Water Pipeline Leak',
    text: 'Drinking water supply pipeline is broken near sector 5, causing massive clean water wastage and low pressure in houses.',
  },
  {
    icon: '🗑️',
    label: 'Garbage Overflow',
    text: 'Municipal garbage dump near the public school has been overflowing for 4 days, emitting foul smell and health hazards.',
  },
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

  // Official Petition Modal State
  const [petitionModalData, setPetitionModalData] = useState(null);

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
    if (e) e.preventDefault();
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

  const handlePrint = () => {
    window.print();
  };

  // KPI calculations
  const totalCount = complaints.length;
  const inProgressCount = complaints.filter(
    (c) => c.status !== 'resolved' && c.status !== 'rejected'
  ).length;
  const resolvedCount = complaints.filter((c) => c.status === 'resolved').length;

  const getStepStatus = (complaintStatus, stepIndex) => {
    // Steps: 0: Submitted, 1: AI Routed, 2: In Action, 3: Resolved
    if (complaintStatus === 'rejected') return stepIndex === 0 ? 'completed' : 'rejected';
    if (complaintStatus === 'resolved') return 'completed';
    if (complaintStatus === 'in_progress') return stepIndex <= 2 ? 'completed' : 'pending';
    if (complaintStatus === 'routed' || complaintStatus === 'classified') {
      return stepIndex <= 1 ? 'completed' : 'pending';
    }
    return stepIndex === 0 ? 'completed' : 'pending';
  };

  return (
    <div className="citizen-portal">
      {/* Portal Header */}
      <div className="portal-header">
        <h1>Citizen Grievance Portal</h1>
        <p className="portal-subtitle">
          Draft formal civic grievance petitions in your preferred regional language using Gemini AI & semantic retrieval, then track resolution progress.
        </p>
      </div>

      {/* Citizen Impact Overview Banner */}
      <div className="citizen-stats-banner">
        <div className="stat-card">
          <div className="stat-icon">📋</div>
          <div className="stat-info">
            <span className="stat-value">{totalCount}</span>
            <span className="stat-label">Total Grievances</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon active">⏳</div>
          <div className="stat-info">
            <span className="stat-value">{inProgressCount}</span>
            <span className="stat-label">Under Triage / Action</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon resolved">✅</div>
          <div className="stat-info">
            <span className="stat-value">{resolvedCount}</span>
            <span className="stat-label">Resolved Issues</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon ai">⚡</div>
          <div className="stat-info">
            <span className="stat-value">100%</span>
            <span className="stat-label">AI RAG Auto-Routed</span>
          </div>
        </div>
      </div>

      <div className="portal-grid">
        {/* Section 1: AI Multilingual Complaint Assistant */}
        <div className="card drafting-card">
          <div className="card-header">
            <div className="icon-title">
              <span className="card-icon">✨</span>
              <h2>AI Multilingual Grievance Assistant</h2>
            </div>
          </div>

          {/* One-Click Quick Starters */}
          <div className="quick-starters-section">
            <label className="quick-label">⚡ Quick Issue Templates (Click to fill):</label>
            <div className="quick-chips">
              {QUICK_STARTERS.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="quick-chip"
                  onClick={() => setUserPrompt(q.text)}
                >
                  <span>{q.icon}</span> {q.label}
                </button>
              ))}
            </div>
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

              <div className="rag-actions-row mt-3">
                <button
                  type="button"
                  className="btn-success"
                  disabled={submitting}
                  onClick={handleSubmitGrievance}
                >
                  {submitting ? 'Submitting Petition...' : 'Approve & Submit Grievance'}
                </button>
                <button
                  type="button"
                  className="btn-outline-print"
                  onClick={() =>
                    setPetitionModalData({
                      id: 'DRAFT-' + Date.now().toString().slice(-6),
                      rawText: userPrompt,
                      petitionBody: generatedDraft,
                      language: selectedLanguage,
                      department: matchedCategories[0]?.department || 'Municipal Corporation',
                      categoryName: matchedCategories[0]?.categoryName || 'Civic Grievance',
                      createdAt: new Date().toISOString(),
                    })
                  }
                >
                  📄 Download Official Petition
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Section 2: Grievance Tracker with Visual Timeline */}
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
                <div key={c.id} className="complaint-item enhanced">
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

                  {/* Visual Stepper */}
                  <div className="grievance-stepper">
                    <div className={`step ${getStepStatus(c.status, 0)}`}>
                      <div className="step-circle">1</div>
                      <span className="step-label">Submitted</span>
                    </div>
                    <div className="step-bar"></div>
                    <div className={`step ${getStepStatus(c.status, 1)}`}>
                      <div className="step-circle">2</div>
                      <span className="step-label">AI Routed</span>
                    </div>
                    <div className="step-bar"></div>
                    <div className={`step ${getStepStatus(c.status, 2)}`}>
                      <div className="step-circle">3</div>
                      <span className="step-label">In Action</span>
                    </div>
                    <div className="step-bar"></div>
                    <div className={`step ${getStepStatus(c.status, 3)}`}>
                      <div className="step-circle">4</div>
                      <span className="step-label">Resolved</span>
                    </div>
                  </div>

                  <div className="complaint-item-body">
                    <p className="raw-text"><strong>Complaint Details:</strong> {c.rawText}</p>
                    {c.translatedText && (
                      <p className="translated-text"><strong>English Translation:</strong> {c.translatedText}</p>
                    )}

                    {/* Admin Inspection Notes if available */}
                    {c.adminNotes && (
                      <div className="admin-notes-box">
                        <span className="notes-icon">📌</span>
                        <div>
                          <strong>Officer Inspection Remarks:</strong> {c.adminNotes}
                        </div>
                      </div>
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

                    <div className="item-actions mt-2">
                      <button
                        type="button"
                        className="btn-link-print"
                        onClick={() =>
                          setPetitionModalData({
                            id: c.id,
                            rawText: c.rawText,
                            petitionBody: c.translatedText || c.rawText,
                            language: c.detectedLanguage,
                            department: c.assignedDepartment || c.matchedCategory?.department || 'Municipal Authority',
                            categoryName: c.matchedCategory?.categoryName || 'Civic Grievance',
                            createdAt: c.createdAt,
                          })
                        }
                      >
                        📄 View & Print Official Petition Letter
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Official Government Petition Modal */}
      {petitionModalData && (
        <div className="modal-overlay" onClick={() => setPetitionModalData(null)}>
          <div className="modal-content petition-modal" onClick={(e) => e.stopPropagation()}>
            <div className="petition-modal-header no-print">
              <h2>Official Civic Grievance Petition</h2>
              <div className="modal-header-actions">
                <button type="button" className="btn-primary btn-sm" onClick={handlePrint}>
                  🖨️ Print / Save as PDF
                </button>
                <button type="button" className="btn-close" onClick={() => setPetitionModalData(null)}>
                  ✕
                </button>
              </div>
            </div>

            {/* Formal Government Letterhead Paper */}
            <div className="petition-document" id="printable-petition">
              <div className="doc-letterhead">
                <div className="doc-emblem">🏛️</div>
                <h3>MUNICIPAL CORPORATION CIVIC GRIEVANCE PETITION</h3>
                <p className="doc-subhead">Citizen Public Redressal & Triage System (CiviBridge)</p>
                <div className="doc-divider"></div>
              </div>

              <div className="doc-meta-grid">
                <div>
                  <p><strong>Tracking Ref No:</strong> #{petitionModalData.id}</p>
                  <p><strong>Date of Filing:</strong> {new Date(petitionModalData.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p><strong>Category:</strong> {petitionModalData.categoryName}</p>
                  <p><strong>Language:</strong> {petitionModalData.language?.toUpperCase()}</p>
                </div>
              </div>

              <div className="doc-addressee">
                <p><strong>TO:</strong></p>
                <p className="addressee-title">The Competent Authority / Executive Officer,</p>
                <p className="addressee-dept">{petitionModalData.department}</p>
                <p>Municipal Corporation & Urban Development Body</p>
              </div>

              <div className="doc-subject">
                <strong>SUBJECT:</strong> Formal Citizen Petition regarding <u>{petitionModalData.categoryName}</u> in local jurisdiction.
              </div>

              <div className="doc-body">
                <p className="salutation">Respected Sir / Madam,</p>
                <div className="doc-text-block">
                  {petitionModalData.petitionBody}
                </div>
                <p className="petition-closing">
                  I kindly request the concerned department officers to inspect the aforementioned location and take prompt corrective measures in public interest.
                </p>
              </div>

              <div className="doc-footer-signatures">
                <div className="doc-stamp-area">
                  <div className="digital-seal">
                    <span>DIGITALLY VERIFIED</span>
                    <small>CiviBridge RAG Portal</small>
                  </div>
                </div>
                <div className="doc-signature-box">
                  <div className="sign-line"></div>
                  <p>Signature / Thumb Impression of Citizen</p>
                  <small>Submitted via Citizen Self-Service Portal</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
