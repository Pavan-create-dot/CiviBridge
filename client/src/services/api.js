// API service module for CiviBridge client
// Handles HTTP communication with Express backend REST API

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Generic fetch wrapper with automatic JWT header injection and JSON parsing.
 */
async function request(endpoint, options = {}) {
  const token = localStorage.getItem('civibridge_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error || `Request failed with status ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

const get = (endpoint) => request(endpoint, { method: 'GET' });

const post = (endpoint, body) =>
  request(endpoint, { method: 'POST', ...(body ? { body: JSON.stringify(body) } : {}) });

const patch = (endpoint, body) =>
  request(endpoint, { method: 'PATCH', body: JSON.stringify(body) });

/**
 * Serialise a params object into a query string, skipping empty values.
 */
function buildQueryString(params) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      query.append(key, val);
    }
  });
  return query.toString() ? `?${query.toString()}` : '';
}

// ── Auth Endpoints ────────────────────────────────────────────────────────────
export function loginUser(email, password) {
  return post('/auth/login', { email, password });
}

export function registerUser(email, password) {
  return post('/auth/register', { email, password });
}

export function registerAdmin(email, password, adminSecret) {
  return post('/auth/register-admin', { email, password, adminSecret });
}

// ── Complaints Endpoints (Citizen) ───────────────────────────────────────────
export function submitComplaint(rawText, detectedLanguage) {
  return post('/complaints', { rawText, detectedLanguage });
}

export function getMyComplaints() {
  return get('/complaints/me');
}

export function getComplaintById(id) {
  return get(`/complaints/${id}`);
}

// ── Translation & RAG Services ───────────────────────────────────────────────
export function translateText(text, sourceLang, targetLang) {
  return post('/translate', { text, sourceLang, targetLang });
}

export function detectLanguage(text) {
  return post('/translate/detect', { text });
}

export function draftComplaintWithRAG(prompt, language) {
  return post('/rag/draft', { prompt, language });
}

// ── Triage Endpoints (Admin) ──────────────────────────────────────────────────
export function getTriageComplaints(params = {}) {
  return get(`/triage/complaints${buildQueryString(params)}`);
}

export function getTriageStats() {
  return get('/triage/stats');
}

export function updateTriageComplaint(id, triageData) {
  return patch(`/triage/complaints/${id}`, triageData);
}

export function autoRouteComplaint(id) {
  return post(`/triage/complaints/${id}/auto-route`);
}

export function getDepartments() {
  return get('/triage/departments');
}
