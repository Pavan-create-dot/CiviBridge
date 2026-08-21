import React, { useState, useEffect } from 'react';
import {
  getAdminComplaints,
  updateComplaintStatus,
  autoRouteComplaint,
  getKnowledgeDocs,
  createKnowledgeDoc,
  updateKnowledgeDoc,
  deleteKnowledgeDoc,
} from '../services/api';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('triage'); // 'triage' | 'knowledge'

  // Triage State
  const [complaints, setComplaints] = useState([]);
  const [stats, setStats] = useState({ total: 0, pendingCount: 0, inProgressCount: 0, resolvedCount: 0 });
  const [loadingTriage, setLoadingTriage] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [triageStatus, setTriageStatus] = useState('');
  const [triagePriority, setTriagePriority] = useState('');
  const [triageDept, setTriageDept] = useState('');
  const [triageNotes, setTriageNotes] = useState('');
  const [triageMessage, setTriageMessage] = useState('');

  // Knowledge Base State
  const [knowledgeDocs, setKnowledgeDocs] = useState([]);
  const [loadingKnowledge, setLoadingKnowledge] = useState(false);
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [editingDocId, setEditingDocId] = useState(null);
  const [docTitle, setDocTitle] = useState('');
  const [docContent, setDocContent] = useState('');
  const [docCategory, setDocCategory] = useState('policy');
  const [savingDoc, setSavingDoc] = useState(false);
  const [kbMessage, setKbMessage] = useState('');

  useEffect(() => {
    if (activeTab === 'triage') fetchComplaints();
    if (activeTab === 'knowledge') fetchKnowledge();
  }, [activeTab]);

  // ── Triage Operations ───────────────────────────────────────────────────────
  const fetchComplaints = async () => {
    setLoadingTriage(true);
    try {
      const data = await getAdminComplaints({ search });
      setComplaints(data.complaints || []);
      setStats(data.stats || { total: 0, pendingCount: 0, inProgressCount: 0, resolvedCount: 0 });
    } catch (err) {
      console.error('Failed to fetch triage complaints:', err);
    } finally {
      setLoadingTriage(false);
    }
  };

  const openTriageModal = (c) => {
    setSelectedComplaint(c);
    setTriageStatus(c.status);
    setTriagePriority(c.priority);
    setTriageDept(c.assignedDepartment || c.matchedCategoryId?.department || '');
    setTriageNotes(c.adminNotes || '');
    setTriageMessage('');
  };

  const handleSaveTriage = async (e) => {
    e.preventDefault();
    if (!selectedComplaint) return;
    setTriageMessage('');
    try {
      const res = await updateComplaintStatus(selectedComplaint._id || selectedComplaint.id, {
        status: triageStatus,
        priority: triagePriority,
        assignedDepartment: triageDept,
        adminNotes: triageNotes,
      });
      setTriageMessage('Complaint triage updated!');
      setSelectedComplaint(res.complaint);
      fetchComplaints();
    } catch (err) {
      setTriageMessage(`Error: ${err.message}`);
    }
  };

  const handleAutoRoute = async () => {
    if (!selectedComplaint) return;
    setTriageMessage('');
    try {
      const res = await autoRouteComplaint(selectedComplaint._id || selectedComplaint.id);
      setSelectedComplaint(res.complaint);
      setTriageStatus(res.complaint.status);
      setTriageDept(res.complaint.assignedDepartment || '');
      setTriageMessage(res.message);
      fetchComplaints();
    } catch (err) {
      setTriageMessage(`Auto-routing error: ${err.message}`);
    }
  };

  // ── Knowledge Base Operations ───────────────────────────────────────────────
  const fetchKnowledge = async () => {
    setLoadingKnowledge(true);
    try {
      const data = await getKnowledgeDocs();
      setKnowledgeDocs(data.docs || []);
    } catch (err) {
      console.error('Failed to fetch knowledge docs:', err);
    } finally {
      setLoadingKnowledge(false);
    }
  };

  const openNewDocModal = () => {
    setEditingDocId(null);
    setDocTitle('');
    setDocContent('');
    setDocCategory('policy');
    setKbMessage('');
    setDocModalOpen(true);
  };

  const openEditDocModal = (doc) => {
    setEditingDocId(doc._id || doc.id);
    setDocTitle(doc.title);
    setDocContent(doc.content);
    setDocCategory(doc.category || 'policy');
    setKbMessage('');
    setDocModalOpen(true);
  };

  const handleSaveKnowledgeDoc = async (e) => {
    e.preventDefault();
    setSavingDoc(true);
    setKbMessage('');

    try {
      if (editingDocId) {
        await updateKnowledgeDoc(editingDocId, { title: docTitle, content: docContent, category: docCategory });
        setKbMessage('Knowledge document updated & re-embedded via Gemini!');
      } else {
        await createKnowledgeDoc({ title: docTitle, content: docContent, category: docCategory });
        setKbMessage('New Knowledge document created & embedded via Gemini!');
      }
      setDocModalOpen(false);
      fetchKnowledge();
    } catch (err) {
      setKbMessage(`Error: ${err.message}`);
    } finally {
      setSavingDoc(false);
    }
  };

  const handleDeleteDoc = async (id) => {
    if (!window.confirm('Delete this knowledge base document?')) return;
    try {
      await deleteKnowledgeDoc(id);
      fetchKnowledge();
    } catch (err) {
      alert(`Failed to delete: ${err.message}`);
    }
  };

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Department Administrator Portal</h1>
          <p className="subtitle">
            Manage citizen grievances triage and maintain the Gemini RAG policy knowledge base.
          </p>
        </div>

        {/* Tab navigation */}
        <div className="admin-tab-nav">
          <button
            className={`tab-nav-btn ${activeTab === 'triage' ? 'active' : ''}`}
            onClick={() => setActiveTab('triage')}
          >
            📋 Grievances Triage
          </button>
          <button
            className={`tab-nav-btn ${activeTab === 'knowledge' ? 'active' : ''}`}
            onClick={() => setActiveTab('knowledge')}
          >
            📚 RAG Knowledge Base
          </button>
        </div>
      </div>

      {kbMessage && <div className="alert-box info mt-2">{kbMessage}</div>}

      {/* TAB 1: GRIEVANCES TRIAGE */}
      {activeTab === 'triage' && (
        <div className="triage-section mt-3">
          {/* Stats Bar */}
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-label">Total Grievances</span>
              <span className="stat-value">{stats.total}</span>
            </div>
            <div className="stat-card warning">
              <span className="stat-label">Pending Triage</span>
              <span className="stat-value">{stats.pendingCount}</span>
            </div>
            <div className="stat-card primary">
              <span className="stat-label">In Progress</span>
              <span className="stat-value">{stats.inProgressCount}</span>
            </div>
            <div className="stat-card success">
              <span className="stat-label">Resolved</span>
              <span className="stat-value">{stats.resolvedCount}</span>
            </div>
          </div>

          <div className="table-card mt-3">
            <div className="card-header flex-between">
              <h2>All Grievances</h2>
              <button className="btn-secondary btn-sm" onClick={fetchComplaints}>Refresh</button>
            </div>

            {loadingTriage ? (
              <div className="loading-spinner">Loading triage complaints...</div>
            ) : complaints.length === 0 ? (
              <div className="empty-state">No complaints filed yet.</div>
            ) : (
              <div className="table-responsive mt-2">
                <table className="triage-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Citizen Email</th>
                      <th>Language</th>
                      <th>Category & Department</th>
                      <th>Priority</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {complaints.map((c) => (
                      <tr key={c._id || c.id}>
                        <td><strong>#{c._id || c.id}</strong></td>
                        <td>{c.userId?.email || 'Citizen'}</td>
                        <td><span className="lang-pill">{c.detectedLanguage?.toUpperCase() || 'EN'}</span></td>
                        <td>
                          <div className="dept-cell">
                            <span className="cat">{c.matchedCategoryId?.categoryName || 'Unclassified'}</span>
                            <span className="dept">{c.assignedDepartment || c.matchedCategoryId?.department || 'Unassigned'}</span>
                          </div>
                        </td>
                        <td><span className={`priority-badge priority-${c.priority}`}>{c.priority}</span></td>
                        <td><span className={`status-badge status-${c.status}`}>{c.status}</span></td>
                        <td>
                          <button className="btn-secondary btn-sm" onClick={() => openTriageModal(c)}>
                            Triage / Route
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: RAG KNOWLEDGE BASE */}
      {activeTab === 'knowledge' && (
        <div className="knowledge-section mt-3">
          <div className="card">
            <div className="card-header flex-between">
              <div>
                <h2>Grounding Policy Knowledge Documents</h2>
                <p className="portal-subtitle">
                  Documents added here are automatically embedded via Gemini and retrieved during citizen complaint generation to ground the draft in official policy.
                </p>
              </div>
              <button className="btn-primary btn-sm" onClick={openNewDocModal}>
                + Add Knowledge Doc
              </button>
            </div>

            {loadingKnowledge ? (
              <div className="loading-spinner">Loading Knowledge Base...</div>
            ) : knowledgeDocs.length === 0 ? (
              <div className="empty-state">No knowledge base documents added yet.</div>
            ) : (
              <div className="knowledge-list mt-3">
                {knowledgeDocs.map((doc) => (
                  <div key={doc._id || doc.id} className="knowledge-item card">
                    <div className="flex-between">
                      <h3>{doc.title}</h3>
                      <div>
                        <button className="btn-secondary btn-sm mr-2" onClick={() => openEditDocModal(doc)}>
                          Edit & Re-embed
                        </button>
                        <button className="btn-danger btn-sm" onClick={() => handleDeleteDoc(doc._id || doc.id)}>
                          Delete
                        </button>
                      </div>
                    </div>
                    <p className="doc-content-preview mt-2">{doc.content}</p>
                    <div className="mt-2"><small className="lang-tag">Category: {doc.category}</small></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Triage Detail & Route Modal */}
      {selectedComplaint && (
        <div className="modal-overlay" onClick={() => setSelectedComplaint(null)}>
          <div className="modal-card modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Triage Complaint #{selectedComplaint._id || selectedComplaint.id}</h2>
              <button className="modal-close" onClick={() => setSelectedComplaint(null)}>&times;</button>
            </div>

            {triageMessage && <div className="alert-box info">{triageMessage}</div>}

            <div className="triage-modal-body mt-2">
              <div className="complaint-detail-panel">
                <h3>Complaint Description</h3>
                <p className="detail-box">{selectedComplaint.rawText}</p>

                {selectedComplaint.generatedDraft && (
                  <div className="mt-2">
                    <label><strong>RAG Generated Draft:</strong></label>
                    <p className="detail-box highlight">{selectedComplaint.generatedDraft}</p>
                  </div>
                )}

                <button type="button" className="btn-accent btn-full mt-3" onClick={handleAutoRoute}>
                  ⚡ Run Gemini Vector Auto-Routing
                </button>
              </div>

              <div className="triage-controls-panel">
                <h3>Update Status & Routing</h3>
                <form onSubmit={handleSaveTriage}>
                  <div className="form-group">
                    <label>Assigned Department</label>
                    <input
                      type="text"
                      value={triageDept}
                      onChange={(e) => setTriageDept(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Priority</label>
                    <select value={triagePriority} onChange={(e) => setTriagePriority(e.target.value)}>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Status</label>
                    <select value={triageStatus} onChange={(e) => setTriageStatus(e.target.value)}>
                      <option value="pending">Pending</option>
                      <option value="classified">Classified</option>
                      <option value="routed">Routed</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Officer Inspection Remarks</label>
                    <textarea
                      rows="3"
                      value={triageNotes}
                      onChange={(e) => setTriageNotes(e.target.value)}
                    ></textarea>
                  </div>

                  <button type="submit" className="btn-primary btn-full mt-2">
                    Save Triage Updates
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Knowledge Base Document Modal */}
      {docModalOpen && (
        <div className="modal-overlay" onClick={() => setDocModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingDocId ? 'Edit Knowledge Base Document' : 'Add New Knowledge Base Document'}</h2>
              <button className="modal-close" onClick={() => setDocModalOpen(false)}>&times;</button>
            </div>

            <form onSubmit={handleSaveKnowledgeDoc} className="auth-form mt-2">
              <div className="form-group">
                <label>Document Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Municipal Pothole Repair Standard Rules"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Document Content / Policy Guidance</label>
                <textarea
                  rows="5"
                  required
                  placeholder="Enter the official government rules, section numbers, or procedure details..."
                  value={docContent}
                  onChange={(e) => setDocContent(e.target.value)}
                ></textarea>
              </div>

              <div className="form-group">
                <label>Category Tag</label>
                <input
                  type="text"
                  placeholder="e.g. policy, sanitation, legal"
                  value={docCategory}
                  onChange={(e) => setDocCategory(e.target.value)}
                />
              </div>

              <button type="submit" className="btn-primary btn-full" disabled={savingDoc}>
                {savingDoc ? 'Embedding via Gemini & Saving...' : 'Save & Embed Document'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
