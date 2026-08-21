import React, { useState, useEffect } from 'react';
import { generateGroundedComplaint, submitComplaint, getMyComplaints, deleteComplaint } from '../services/api';

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

// Helper to strip accidental duplicate TO / SUBJECT headers from draft body
function cleanDraftBody(text) {
  if (!text) return '';
  return text
    .replace(/^SUBJECT:[^\n]*\n?/gmi, '')
    .replace(/^TO:[^\n]*\n?/gmi, '')
    .trim();
}

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
      // 1. Run RAG Pipeline
      const ragRes = await generateGroundedComplaint(userPrompt, selectedLanguage);

      setGeneratedDraft(ragRes.draft);
      setMatchedCategory(ragRes.topMatchCategory);
      setMatchedKnowledge(ragRes.matchedKnowledge || []);

      // 2. Auto-save grievance to MongoDB
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

  const handleDeleteGrievance = async (id) => {
    if (!window.confirm('Are you sure you want to delete this filed grievance?')) return;
    try {
      await deleteComplaint(id);
      fetchComplaints();
    } catch (err) {
      alert(`Failed to delete grievance: ${err.message}`);
    }
  };

  const downloadPDF = (elementId, filename = 'CiviBridge-Grievance-Petition.pdf') => {
    const element = document.getElementById(elementId);
    if (!element) return;

    if (window.html2pdf) {
      const opt = {
        margin: [0.2, 0.2, 0.2, 0.2], // 0.2 in margin ensures exact 1-page fit!
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
        pagebreak: { mode: 'avoid-all' },
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
                <div className="grounding-sources mt-1">
                  <small><strong>Grounded in Government Policy Docs:</strong> {matchedKnowledge.map(k => k.title).join(', ')}</small>
                </div>
              )}

              <div className="rag-content mt-2">
                <pre>{cleanDraftBody(generatedDraft)}</pre>
              </div>

              <div className="rag-actions-row mt-3">
                <button
                  type="button"
                  className="btn-success"
                  onClick={() =>
                    setActiveModalPetition({
                      id: currentComplaintId || 'DRAFT',
                      draft: cleanDraftBody(generatedDraft),
                      categoryName: matchedCategory?.categoryName || 'Civic Grievance',
                      department: matchedCategory?.department || 'Municipal Authority',
                      language: selectedLanguage,
                      createdAt: new Date().toISOString(),
                    })
                  }
                >
                  📄 Preview & Download Official PDF
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

                  <div className="item-actions flex-between mt-3">
                    <button
                      className="btn-secondary btn-sm"
                      onClick={() =>
                        setActiveModalPetition({
                          id: c._id || c.id,
                          draft: cleanDraftBody(c.generatedDraft || c.rawText),
                          categoryName: c.matchedCategoryId?.categoryName || 'Civic Grievance',
                          department: c.assignedDepartment || c.matchedCategoryId?.department || 'Municipal Authority',
                          language: c.detectedLanguage || 'en',
                          createdAt: c.createdAt,
                        })
                      }
                    >
                      📄 Download PDF
                    </button>

                    <button
                      className="btn-danger btn-sm"
                      onClick={() => handleDeleteGrievance(c._id || c.id)}
                    >
                      🗑️ Delete
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
              <div className="modal-title-wrap">
                <h2>🏛️ Official Civic Grievance Petition</h2>
                <p className="modal-sub">Formatted & Grounded for Municipal Corporation Filing</p>
              </div>
              <div className="modal-header-actions">
                <button
                  type="button"
                  className="btn-download-pdf"
                  onClick={() => downloadPDF('printable-pdf-document', `CiviBridge-Petition-${activeModalPetition.id}.pdf`)}
                >
                  📥 Download Official PDF
                </button>
                <button type="button" className="btn-close" onClick={() => setActiveModalPetition(null)}>✕</button>
              </div>
            </div>

            {/* Scrollable Container for Preview */}
            <div className="petition-modal-scroll-area">
              {/* Formal Government Printable Document (Letterhead Design - Single Page Fit) */}
              <div className="petition-document" id="printable-pdf-document">
                <div className="doc-watermark">CiviBridge Official</div>

                {/* Header Letterhead */}
                <div className="doc-letterhead-formal">
                  <div className="doc-emblem-seal">🏛️</div>
                  <div className="doc-header-text">
                    <h3>MUNICIPAL CORPORATION & URBAN LOCAL BODY</h3>
                    <p className="doc-subtitle-formal">Public Grievance Redressal & Citizen Welfare Cell</p>
                    <p className="doc-portal-ref">Issued via CiviBridge AI Regional Language Portal (RAG System)</p>
                  </div>
                </div>
                <div className="doc-header-line"></div>

                {/* Reference Grid */}
                <div className="doc-meta-grid-formal">
                  <div className="meta-col">
                    <p><strong>Tracking Ref ID:</strong> <span className="ref-highlight">#{activeModalPetition.id}</span></p>
                    <p><strong>Date of Submission:</strong> {new Date(activeModalPetition.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="meta-col text-right">
                    <p><strong>Civic Category:</strong> {activeModalPetition.categoryName}</p>
                    <p><strong>Petition Language:</strong> {activeModalPetition.language.toUpperCase()}</p>
                  </div>
                </div>

                {/* Addressee Section */}
                <div className="doc-addressee-formal">
                  <p className="to-label">TO:</p>
                  <p className="addressee-title">The Competent Municipal Commissioner / Executive Engineer,</p>
                  <p className="addressee-dept">{activeModalPetition.department}</p>
                  <p className="addressee-office">Municipal Public Works & Urban Infrastructure Division</p>
                </div>

                {/* Subject Line */}
                <div className="doc-subject-formal">
                  <span className="subj-tag">SUBJECT:</span> Formal Citizen Petition regarding <u>{activeModalPetition.categoryName}</u> in local jurisdiction.
                </div>

                {/* Main Body */}
                <div className="doc-body-formal">
                  <div className="doc-text-block-formal">
                    {activeModalPetition.draft}
                  </div>
                </div>

                {/* Footer Stamps & Signature */}
                <div className="doc-footer-formal">
                  <div className="digital-verification-stamp">
                    <div className="stamp-badge">
                      <span>DIGITALLY VERIFIED</span>
                      <small>RAG Policy Grounded</small>
                    </div>
                  </div>

                  <div className="doc-signature-block">
                    <div className="signature-line"></div>
                    <p className="sig-title">Signature / Mark of Citizen Petitioner</p>
                    <small className="sig-sub">Submitted via Citizen Public Self-Service Portal</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
