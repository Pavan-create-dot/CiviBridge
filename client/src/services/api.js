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

// ── Auth Endpoints ────────────────────────────────────────────────────────────
export async function loginUser(email, password) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function registerUser(email, password) {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function registerAdmin(email, password, adminSecret) {
  return request('/auth/register-admin', {
    method: 'POST',
    body: JSON.stringify({ email, password, adminSecret }),
  });
}

// ── Complaints Endpoints (Citizen) ───────────────────────────────────────────
export async function submitComplaint(rawText, detectedLanguage) {
  return request('/complaints', {
    method: 'POST',
    body: JSON.stringify({ rawText, detectedLanguage }),
  });
}

export async function getMyComplaints() {
  return request('/complaints/me', {
    method: 'GET',
  });
}

export async function getComplaintById(id) {
  return request(`/complaints/${id}`, {
    method: 'GET',
  });
}

// ── Translation & RAG Services ───────────────────────────────────────────────
export async function translateText(text, sourceLang, targetLang) {
  return request('/translate', {
    method: 'POST',
    body: JSON.stringify({ text, sourceLang, targetLang }),
  });
}

export async function detectLanguage(text) {
  return request('/translate/detect', {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
}

export async function draftComplaintWithRAG(prompt, language) {
  return request('/rag/draft', {
    method: 'POST',
    body: JSON.stringify({ prompt, language }),
  });
}

// ── Triage Endpoints (Admin) ──────────────────────────────────────────────────
export async function getTriageComplaints(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      query.append(key, val);
    }
  });
  const queryString = query.toString() ? `?${query.toString()}` : '';
  return request(`/triage/complaints${queryString}`, {
    method: 'GET',
  });
}

export async function getTriageStats() {
  return request('/triage/stats', {
    method: 'GET',
  });
}

export async function updateTriageComplaint(id, triageData) {
  return request(`/triage/complaints/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(triageData),
  });
}

export async function autoRouteComplaint(id) {
  return request(`/triage/complaints/${id}/auto-route`, {
    method: 'POST',
  });
}

export async function getDepartments() {
  return request('/triage/departments', {
    method: 'GET',
  });
}
