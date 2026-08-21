import React, { useState, useEffect } from 'react';
import { generateGroundedComplaint, submitComplaint, getMyComplaints } from '../services/api';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'te', label: 'Telugu (తెలుగు)' },
  { code: 'hi', label: 'Hindi (हिंदी)' },
];

const QUICK_STARTERS = [
  {
    icon: '🕳️',
    label: 'Road Pothole',
    text: 'There is a severe pothole near the main market road causing vehicle damage and traffic hazards.',
  },
  {
    icon: '💡',
    label: 'Streetlight Broken',
    text: 'Streetlights on 4th cross street have not been working for a week, making the road dark and unsafe.',
  },
  {
    icon: '🚰',
    label: 'Water Leakage',
    text: 'Drinking water pipeline is leaking heavily near sector 5, causing water wastage and low pressure.',
  },
  {
    icon: '🗑️',
    label: 'Garbage Dump',
    text: 'Garbage has not been collected near the public school for 4 days, emitting foul smell.',
  },
];

export default function CitizenPortal() {
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [userPrompt, setUserPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Generated RAG output
  const [generatedDraft, setGeneratedDraft] = useState('');
  const [matchedCategory, setMatchedCategory] = useState(null);
  const [matchedKnowledge, setMatchedKnowledge] = useState([]);
  const [currentComplaintId, setCurrentComplaintId] = useState(null);

  // User submitted complaints list
  const [myComplaints, setMyComplaints] = useState([]);
  const [loadingComplaints, setLoadingComplaints] = useState(false);

  // Petition Preview Modal for PDF Download
  const [activeModalPetition, setActiveModalPetition] = useState(null);

  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    setLoadingComplaints(true);
    try {
      const data = await getMyComplaints();
      setMyComplaints(data.complaints || []);
    } catch (err) {
      console.error('Failed to load my complaints:', err);
    } finally {
      setLoadingComplaints(false);
    }
  };

  const handleGenerateAndSubmit = async (e) => {
    e.preventDefault();
    if (!userPrompt.trim()) return;

    setLoading(true);
    setError('');
    setSuccessMessage('');
    setGeneratedDraft('');
    setMatchedCategory(null);
    setMatchedKnowledge([]);

    try {
      // 1. Run RAG Pipeline (Retrieve + Augment + Generate Grounded Petition)
      const ragRes = await generateGroundedComplaint(userPrompt, selectedLanguage);

      setGeneratedDraft(ragRes.draft);
      setMatchedCategory(ragRes.topMatchCategory);
      setMatchedKnowledge(ragRes.matchedKnowledge || []);

      // 2. Automatically save the grievance into MongoDB
      const saveRes = await submitComplaint({
        rawText: userPrompt,
        detectedLanguage: selectedLanguage,
        generatedDraft: ragRes.draft,
        matchedCategoryId: ragRes.topMatchCategory ? (ragRes.topMatchCategory._id || ragRes.topMatchCategory.id) : null,
      });

      const savedId = saveRes.complaint._id || saveRes.complaint.id;
      setCurrentComplaintId(savedId);
      setSuccessMessage(`Grounded Petition generated & recorded! Tracking ID: #${savedId}`);

      fetchComplaints();
    } catch (err) {
      setError(err.message || 'Failed to generate petition.');
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = (elementId, filename = 'CiviBridge-Grievance-Petition.pdf') => {
    const element = document.getElementById(elementId);
    if (!element) return;

    if (window.html2pdf) {
      const opt = {
        margin: 0.5,
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
      };
      window.html2pdf().set(opt).from(element).save();
    } else {
      window.print();
    }
  };

  return (
    <div className="citizen-portal">
      <div className="portal-header">
        <h1>Citizen Public Grievance Portal</h1>
        <p className="portal-subtitle">
          Describe your problem in your native language. Our AI uses RAG (Retrieval-Augmented Generation) to classify your issue and generate a grounded, official government complaint petition ready for PDF download.
        </p>
      </div>

      <div className="portal-grid">
        {/* Left Column: Complaint Generator */}
        <div className="card drafting-card">
          <div className="card-header">
            <h2>✨ AI Grievance Assistant</h2>
          </div>

          <div className="quick-starters-section">
            <label className="quick-label">Quick Sample Topics:</label>
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

          <form onSubmit={handleGenerateAndSubmit} className="draft-form mt-3">
            <div className="form-group">
              <label>Select Preferred Output Language</label>
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
              <label>Describe Your Grievance (in English, Telugu, or Hindi)</label>
              <textarea
                rows="4"
                required
                placeholder="Example: మా వీధిలో రోడ్డు గుంతలు చాలా ఉన్నాయి... / Streetlight broken near market..."
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
              ></textarea>
            </div>

            <button type="submit" className="btn-primary btn-full" disabled={loading || !userPrompt.trim()}>
              {loading ? 'Running RAG Retrieval & Drafting...' : '⚡ Generate Grounded Petition'}
            </button>
          </form>

          {error && <div className="alert-box error mt-3">{error}</div>}
          {successMessage && <div className="alert-box success mt-3">{successMessage}</div>}

          {/* Generated RAG Grounded Output Display */}
          {generatedDraft && (
            <div className="rag-output-box mt-4">
              <div className="rag-header">
                <h3>Official Grounded Petition Draft</h3>
                <span className="lang-tag">{selectedLanguage.toUpperCase()}</span>
              </div>

              {matchedCategory && (
                <div className="matched-category-banner">
                  <span><strong>AI Classification:</strong> {matchedCategory.categoryName}</span>
                  <span><strong>Department:</strong> {matchedCategory.department}</span>
                </div>
              )}

              {matchedKnowledge.length > 0 && (
                <div className="grounding-sources">
                  <small><strong>Grounded in Government Policy Docs:</strong> {matchedKnowledge.map(k => k.title).join(', ')}</small>
                </div>
              )}

              <div className="rag-content mt-2">
                <pre>{generatedDraft}</pre>
              </div>

              <div className="rag-actions-row mt-3">
                <button
                  type="button"
                  className="btn-success"
                  onClick={() =>
                    setActiveModalPetition({
                      id: currentComplaintId || 'DRAFT',
                      draft: generatedDraft,
                      categoryName: matchedCategory?.categoryName || 'Civic Grievance',
                      department: matchedCategory?.department || 'Municipal Authority',
                      language: selectedLanguage,
                      createdAt: new Date().toISOString(),
                    })
                  }
                >
                  📄 Preview & Download PDF
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: My Grievances History */}
        <div className="card tracker-card">
          <div className="card-header">
            <h2>📋 My Filed Grievances</h2>
            <button className="btn-secondary btn-sm" onClick={fetchComplaints}>Refresh</button>
          </div>

          {loadingComplaints ? (
            <div className="loading-spinner">Loading your grievances...</div>
          ) : myComplaints.length === 0 ? (
            <div className="empty-state">No grievances submitted yet. Fill the form to generate one.</div>
          ) : (
            <div className="complaint-list">
              {myComplaints.map((c) => (
                <div key={c._id || c.id} className="complaint-item">
                  <div className="complaint-item-header">
                    <span className="complaint-id">#{c._id || c.id}</span>
                    <span className={`status-badge status-${c.status}`}>{c.status}</span>
                  </div>

                  <p className="raw-text"><strong>Issue:</strong> {c.rawText}</p>

                  <div className="item-meta mt-1">
                    {c.matchedCategoryId && (
                      <span className="meta-tag">
                        <strong>Category:</strong> {c.matchedCategoryId.categoryName}
                      </span>
                    )}
                    {c.assignedDepartment && (
                      <span className="meta-tag dept">
                        <strong>Dept:</strong> {c.assignedDepartment}
                      </span>
                    )}
                  </div>

                  {c.adminNotes && (
                    <div className="admin-notes-box mt-2">
                      <small><strong>Officer Remarks:</strong> {c.adminNotes}</small>
                    </div>
                  )}

                  <div className="item-actions mt-2">
                    <button
                      className="btn-secondary btn-sm"
                      onClick={() =>
                        setActiveModalPetition({
                          id: c._id || c.id,
                          draft: c.generatedDraft || c.rawText,
                          categoryName: c.matchedCategoryId?.categoryName || 'Civic Grievance',
                          department: c.assignedDepartment || c.matchedCategoryId?.department || 'Municipal Authority',
                          language: c.detectedLanguage || 'en',
                          createdAt: c.createdAt,
                        })
                      }
                    >
                      📄 Download Official PDF
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Official Government Petition Modal for PDF Generation */}
      {activeModalPetition && (
        <div className="modal-overlay" onClick={() => setActiveModalPetition(null)}>
          <div className="modal-content petition-modal" onClick={(e) => e.stopPropagation()}>
            <div className="petition-modal-header no-print">
              <h2>Official Civic Petition Document</h2>
              <div className="modal-header-actions">
                <button
                  type="button"
                  className="btn-primary btn-sm"
                  onClick={() => downloadPDF('printable-pdf-document', `CiviBridge-Petition-${activeModalPetition.id}.pdf`)}
                >
                  📥 Download PDF
                </button>
                <button type="button" className="btn-close" onClick={() => setActiveModalPetition(null)}>✕</button>
              </div>
            </div>

            {/* Formal Government Printable Document */}
            <div className="petition-document" id="printable-pdf-document">
              <div className="doc-letterhead">
                <div className="doc-emblem">🏛️</div>
                <h3>MUNICIPAL CORPORATION CIVIC PETITION</h3>
                <p className="doc-subhead">Public Grievance & Redressal Portal (CiviBridge RAG System)</p>
                <div className="doc-divider"></div>
              </div>

              <div className="doc-meta-grid">
                <div>
                  <p><strong>Tracking Ref No:</strong> #{activeModalPetition.id}</p>
                  <p><strong>Date:</strong> {new Date(activeModalPetition.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p><strong>Category:</strong> {activeModalPetition.categoryName}</p>
                  <p><strong>Language:</strong> {activeModalPetition.language.toUpperCase()}</p>
                </div>
              </div>

              <div className="doc-addressee">
                <p><strong>TO:</strong></p>
                <p className="addressee-title">The Executive Commissioner / Competent Authority,</p>
                <p className="addressee-dept">{activeModalPetition.department}</p>
                <p>Municipal Corporation Authority</p>
              </div>

              <div className="doc-subject">
                <strong>SUBJECT:</strong> Formal Public Petition regarding <u>{activeModalPetition.categoryName}</u>.
              </div>

              <div className="doc-body">
                <div className="doc-text-block">
                  {activeModalPetition.draft}
                </div>
              </div>

              <div className="doc-footer-signatures mt-4">
                <div className="doc-stamp-area">
                  <div className="digital-seal">
                    <span>DIGITALLY VERIFIED</span>
                    <small>CiviBridge RAG System</small>
                  </div>
                </div>
                <div className="doc-signature-box">
                  <div className="sign-line"></div>
                  <p>Signature of Petitioner Citizen</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
