// AdminDashboard component — Department Administrator Triage Portal
import React, { useState, useEffect } from 'react';
import {
  getTriageComplaints,
  getTriageStats,
  updateTriageComplaint,
  autoRouteComplaint,
  getDepartments,
} from '../services/api';

export default function AdminDashboard() {
  // Analytics Stats State
  const [stats, setStats] = useState(null);

  // Filter & List State
  const [complaints, setComplaints] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [availableDepartments, setAvailableDepartments] = useState([]);
  const [availableCategories, setAvailableCategories] = useState([]);

  // Selected Complaint for Triage Modal
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [triageStatus, setTriageStatus] = useState('');
  const [triagePriority, setTriagePriority] = useState('');
  const [triageDept, setTriageDept] = useState('');
  const [triageCategoryId, setTriageCategoryId] = useState('');
  const [triageNotes, setTriageNotes] = useState('');
  const [updating, setUpdating] = useState(false);
  const [modalMessage, setModalMessage] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchComplaintsData();
  }, [pagination.page, statusFilter, priorityFilter, deptFilter]);

  const fetchInitialData = async () => {
    try {
      const [statsRes, deptRes] = await Promise.all([getTriageStats(), getDepartments()]);
      setStats(statsRes.stats);
      setAvailableDepartments(deptRes.departments || []);
      setAvailableCategories(deptRes.categories || []);
    } catch (err) {
      console.error('Failed to load triage initial data:', err);
    }
  };

  const fetchComplaintsData = async () => {
    setLoading(true);
    try {
      const data = await getTriageComplaints({
        search,
        status: statusFilter,
        priority: priorityFilter,
        department: deptFilter,
        page: pagination.page,
        limit: pagination.limit,
      });
      setComplaints(data.complaints || []);
      setPagination(data.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });
    } catch (err) {
      console.error('Failed to fetch triage complaints:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchComplaintsData();
  };

  const openTriageModal = (complaint) => {
    setSelectedComplaint(complaint);
    setTriageStatus(complaint.status);
    setTriagePriority(complaint.priority);
    setTriageDept(complaint.assignedDepartment || complaint.matchedCategory?.department || '');
    setTriageCategoryId(complaint.matchedCategoryId ? String(complaint.matchedCategoryId) : '');
    setTriageNotes(complaint.adminNotes || '');
    setModalMessage('');
  };

  const closeTriageModal = () => {
    setSelectedComplaint(null);
  };

  const handleSaveTriage = async () => {
    if (!selectedComplaint) return;
    setUpdating(true);
    setModalMessage('');

    try {
      const updatePayload = {
        status: triageStatus,
        priority: triagePriority,
        assignedDepartment: triageDept || null,
        matchedCategoryId: triageCategoryId ? parseInt(triageCategoryId, 10) : null,
        adminNotes: triageNotes,
      };

      const res = await updateTriageComplaint(selectedComplaint.id, updatePayload);
      setModalMessage('Triage details updated successfully!');
      
      // Update item in local state list
      setComplaints((prev) =>
        prev.map((c) => (c.id === selectedComplaint.id ? res.complaint : c))
      );
      
      // Refresh statistics header
      fetchInitialData();
    } catch (err) {
      setModalMessage(`Error: ${err.message}`);
    } finally {
      setUpdating(false);
    }
  };

  const handleAutoRoute = async () => {
    if (!selectedComplaint) return;
    setUpdating(true);
    setModalMessage('');

    try {
      const res = await autoRouteComplaint(selectedComplaint.id);
      setSelectedComplaint(res.complaint);
      setTriageStatus(res.complaint.status);
      setTriageDept(res.complaint.assignedDepartment || '');
      setTriageCategoryId(res.complaint.matchedCategoryId ? String(res.complaint.matchedCategoryId) : '');
      setModalMessage(`Auto-routed to ${res.topMatch.category.department} (Match Score: ${(res.topMatch.score * 100).toFixed(0)}%)`);
      
      fetchComplaintsData();
      fetchInitialData();
    } catch (err) {
      setModalMessage(`Auto-routing failed: ${err.message}`);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Department Administrator Triage Portal</h1>
          <p className="subtitle">
            Manage citizen grievances, monitor department routing, update triage statuses, and execute AI auto-routing.
          </p>
        </div>
        <button className="btn-secondary" onClick={() => { fetchInitialData(); fetchComplaintsData(); }}>
          🔄 Refresh Portal
        </button>
      </div>

      {/* KPI Stats Overview Cards */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-label">Total Grievances</span>
            <span className="stat-value">{stats.totalComplaints}</span>
          </div>
          <div className="stat-card warning">
            <span className="stat-label">Pending / Unassigned</span>
            <span className="stat-value">{stats.statusCounts.pending + stats.statusCounts.classified}</span>
          </div>
          <div className="stat-card primary">
            <span className="stat-label">In Progress</span>
            <span className="stat-value">{stats.statusCounts.in_progress}</span>
          </div>
          <div className="stat-card urgent">
            <span className="stat-label">Urgent Priority</span>
            <span className="stat-value">{stats.priorityCounts.urgent}</span>
          </div>
          <div className="stat-card success">
            <span className="stat-label">Resolution Rate</span>
            <span className="stat-value">{stats.resolutionRate}%</span>
          </div>
        </div>
      )}

      {/* Filter & Toolbar */}
      <div className="toolbar-card">
        <form onSubmit={handleSearchSubmit} className="toolbar-form">
          <div className="search-input-wrap">
            <input
              type="text"
              placeholder="Search complaint text, notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button type="submit" className="btn-primary btn-sm">Search</button>
          </div>

          <div className="filters-wrap">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="classified">Classified</option>
              <option value="routed">Routed</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="rejected">Rejected</option>
            </select>

            <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
              <option value="">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>

            <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
              <option value="">All Departments</option>
              {availableDepartments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </form>
      </div>

      {/* Complaints Table */}
      <div className="table-card">
        {loading ? (
          <div className="loading-spinner">Loading triage complaints...</div>
        ) : complaints.length === 0 ? (
          <div className="empty-state">No complaints match the selected triage filters.</div>
        ) : (
          <div className="table-responsive">
            <table className="triage-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Citizen</th>
                  <th>Lang</th>
                  <th>Category & Department</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {complaints.map((c) => (
                  <tr key={c.id}>
                    <td><strong>#{c.id}</strong></td>
                    <td>{c.user?.email || 'Citizen'}</td>
                    <td><span className="lang-pill">{c.detectedLanguage.toUpperCase()}</span></td>
                    <td>
                      <div className="dept-cell">
                        <span className="cat">{c.matchedCategory?.categoryName || 'Unclassified'}</span>
                        <span className="dept">{c.assignedDepartment || c.matchedCategory?.department || 'Unassigned'}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`priority-badge priority-${c.priority}`}>{c.priority}</span>
                    </td>
                    <td>
                      <span className={`status-badge status-${c.status}`}>{c.status.replace('_', ' ')}</span>
                    </td>
                    <td>{new Date(c.createdAt).toLocaleDateString()}</td>
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

        {/* Pagination Controls */}
        <div className="pagination-bar">
          <span>
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} total grievances)
          </span>
          <div className="pagination-buttons">
            <button
              disabled={pagination.page <= 1}
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
            >
              Previous
            </button>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Triage Detail & Action Modal */}
      {selectedComplaint && (
        <div className="modal-overlay" onClick={closeTriageModal}>
          <div className="modal-card modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Triage Grievance #{selectedComplaint.id}</h2>
              <button className="modal-close" onClick={closeTriageModal}>&times;</button>
            </div>

            {modalMessage && (
              <div className={`alert-box ${modalMessage.startsWith('Error') ? 'error' : 'info'}`}>
                {modalMessage}
              </div>
            )}

            <div className="triage-modal-body">
              <div className="complaint-detail-panel">
                <h3>Complaint Details</h3>
                <div className="detail-field">
                  <label>Raw Complaint Text ({selectedComplaint.detectedLanguage.toUpperCase()}):</label>
                  <p className="detail-box">{selectedComplaint.rawText}</p>
                </div>

                {selectedComplaint.translatedText && (
                  <div className="detail-field">
                    <label>Gemini Translated Text (English):</label>
                    <p className="detail-box highlight">{selectedComplaint.translatedText}</p>
                  </div>
                )}

                <div className="auto-route-panel mt-3">
                  <button className="btn-accent btn-full" onClick={handleAutoRoute} disabled={updating}>
                    ⚡ Run Gemini RAG Auto-Routing
                  </button>
                  <span className="form-hint">
                    Analyzes complaint text against database vector embeddings to assign category & department automatically.
                  </span>
                </div>
              </div>

              <div className="triage-controls-panel">
                <h3>Department Triage Actions</h3>
                <form onSubmit={(e) => { e.preventDefault(); handleSaveTriage(); }}>
                  <div className="form-group">
                    <label>Assigned Department</label>
                    <input
                      type="text"
                      placeholder="e.g. Municipal Roads Department"
                      value={triageDept}
                      onChange={(e) => setTriageDept(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Matched Grievance Category</label>
                    <select
                      value={triageCategoryId}
                      onChange={(e) => setTriageCategoryId(e.target.value)}
                    >
                      <option value="">-- Select Category --</option>
                      {availableCategories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.categoryName} ({cat.department})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Triage Priority Level</label>
                    <select value={triagePriority} onChange={(e) => setTriagePriority(e.target.value)}>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Resolution Status</label>
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
                    <label>Admin Action Notes / Inspection Logs</label>
                    <textarea
                      rows="3"
                      placeholder="Enter internal notes, dispatched teams, or resolution logs..."
                      value={triageNotes}
                      onChange={(e) => setTriageNotes(e.target.value)}
                    ></textarea>
                  </div>

                  <div className="form-actions mt-3">
                    <button type="submit" className="btn-primary btn-full" disabled={updating}>
                      {updating ? 'Saving...' : 'Save Triage Changes'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
