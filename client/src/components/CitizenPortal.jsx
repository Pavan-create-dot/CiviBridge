import React, { useState, useEffect } from 'react';
import { generateGroundedComplaint, submitComplaint, getMyComplaints, deleteComplaint } from '../services/api';
import { onGrievanceUpdated } from '../services/socket';

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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // RAG Generation output — kept in-memory until citizen submits
  const [generatedDraft, setGeneratedDraft] = useState('');
  const [ragCategory, setRagCategory] = useState('');
  const [ragDepartment, setRagDepartment] = useState('');
  const [ragPriority, setRagPriority] = useState('');
  const [ragSources, setRagSources] = useState([]);
  const [matchedCategoryId, setMatchedCategoryId] = useState(null);
  const [readyToSubmit, setReadyToSubmit] = useState(false);

  // Citizen's submitted grievances list
  const [myComplaints, setMyComplaints] = useState([]);
  const [loadingComplaints, setLoadingComplaints] = useState(false);

  // Petition Preview Modal for PDF Download
  const [activeModalPetition, setActiveModalPetition] = useState(null);

  useEffect(() => {
    fetchComplaints();
  }, []);

  // Socket.IO: live status updates from admin triage
  useEffect(() => {
    const unsubscribe = onGrievanceUpdated((updatedGrievance) => {
      setMyComplaints((prev) =>
        prev.map((c) =>
          (c._id || c.id) === (updatedGrievance._id || updatedGrievance.id) ? updatedGrievance : c
        )
      );
    });
    return unsubscribe;
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

  // STEP 1: Generate petition via RAG — does NOT save to database
  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!userPrompt.trim()) return;

    setLoading(true);
    setError('');
    setSuccessMessage('');
    setGeneratedDraft('');
    setRagCategory('');
    setRagDepartment('');
    setRagPriority('');
    setRagSources([]);
    setMatchedCategoryId(null);
    setReadyToSubmit(false);

    try {
      const ragRes = await generateGroundedComplaint(userPrompt, selectedLanguage);

      setGeneratedDraft(ragRes.draft || '');
      setRagCategory(ragRes.category || '');
      setRagDepartment(ragRes.department || '');
      setRagPriority(ragRes.priority || 'medium');
      setRagSources(ragRes.sources || ragRes.matchedKnowledge || []);
      setMatchedCategoryId(
        ragRes.matchedCategoryId ||
        (ragRes.topMatchCategory ? (ragRes.topMatchCategory._id || ragRes.topMatchCategory.id) : null)
      );
      setReadyToSubmit(true);
    } catch (err) {
      setError(err.message || 'Failed to generate petition. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: Submit — saves the reviewed grievance to the database
  const handleSubmit = async () => {
    if (!generatedDraft || submitting) return;

    setSubmitting(true);
    setError('');
    setSuccessMessage('');

    try {
      const saveRes = await submitComplaint({
        rawText: userPrompt,
        detectedLanguage: selectedLanguage,
        generatedDraft,
        matchedCategoryId,
        assignedDepartment: ragDepartment,
        priority: ragPriority,
        sources: ragSources,
      });

      const grievance = saveRes.grievance || saveRes.complaint || {};
      const savedId = grievance._id || grievance.id;
      setSuccessMessage(`Grievance submitted successfully! Tracking ID: #${savedId}`);
      setReadyToSubmit(false);
      setGeneratedDraft('');
      setUserPrompt('');
      fetchComplaints();
    } catch (err) {
      setError(err.message || 'Failed to submit grievance.');
    } finally {
      setSubmitting(false);
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

          <form onSubmit={handleGenerate} className="draft-form mt-3">
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

          {/* Review section — only shown after generation, before submission */}
          {readyToSubmit && generatedDraft && (
            <div className="review-section mt-3">
              <h3 className="review-title">📝 Review Your Petition</h3>

              {(ragCategory || ragDepartment || ragPriority) && (
                <div className="rag-meta-row">
                  {ragCategory && <span className="meta-tag"><strong>Category:</strong> {ragCategory}</span>}
                  {ragDepartment && <span className="meta-tag dept"><strong>Dept:</strong> {ragDepartment}</span>}
                  {ragPriority && <span className={`meta-tag priority-${ragPriority}`}><strong>Priority:</strong> {ragPriority}</span>}
                </div>
              )}

              <div className="draft-preview">
                <pre className="draft-text">{generatedDraft}</pre>
              </div>

              {ragSources && ragSources.length > 0 && (
                <div className="sources-section mt-2">
                  <strong>📚 Grounded on:</strong>
                  <ul className="sources-list">
                    {ragSources.map((s, i) => (
                      <li key={i}>{s.title || s.source || `Document chunk ${i + 1}`}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="review-actions mt-3">
                <button
                  className="btn-secondary btn-sm"
                  onClick={() => { setReadyToSubmit(false); setGeneratedDraft(''); }}
                >
                  ✏️ Edit Prompt
                </button>
                <button
                  className="btn-primary"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? 'Filing Grievance...' : '✅ Submit Grievance'}
                </button>
              </div>
            </div>
          )}

          {error && <div className="alert-box error mt-3">{error}</div>}
          {successMessage && <div className="alert-box success mt-3">{successMessage}</div>}
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
