const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('civibridge_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error || data.detail || `Request failed with status ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

// ── Auth Services ──────────────────────────────────────────────────────────────
export async function loginUser(email, password) {
  return request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
}

export async function registerUser(email, password) {
  return request('/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) });
}

export async function registerAdmin(email, password, adminSecret) {
  return request('/auth/register-admin', {
    method: 'POST',
    body: JSON.stringify({ email, password, adminSecret }),
  });
}

// ── RAG Services ──────────────────────────────────────────────────────────────
export async function generateGroundedComplaint(prompt, language) {
  return request('/rag/generate', {
    method: 'POST',
    body: JSON.stringify({ grievance: prompt, prompt, language }),
  });
}

// ── Grievance Services ────────────────────────────────────────────────────────
export async function submitComplaint(payload) {
  return request('/grievances', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getMyComplaints() {
  const data = await request('/grievances/me', { method: 'GET' });
  // Normalize: support both grievances and complaints keys
  return { complaints: data.grievances || data.complaints || [] };
}

export async function deleteComplaint(id) {
  return request(`/grievances/${id}`, { method: 'DELETE' });
}

export async function getAdminComplaints(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') query.append(k, v);
  });
  const qStr = query.toString() ? `?${query.toString()}` : '';
  const data = await request(`/grievances${qStr}`, { method: 'GET' });
  // Normalize: backend returns both grievances and complaints keys for compatibility
  return {
    complaints: data.grievances || data.complaints || [],
    stats: data.stats || {},
  };
}

export async function updateComplaintStatus(id, updateData) {
  const data = await request(`/grievances/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updateData),
  });
  return { complaint: data.grievance || data.complaint, ...data };
}

export async function autoRouteComplaint(id) {
  return request(`/grievances/${id}/auto-route`, { method: 'POST' });
}

// ── Admin Knowledge Base Services ──────────────────────────────────────────────
export async function getKnowledgeDocs() {
  return request('/knowledge', { method: 'GET' });
}

export async function createKnowledgeDoc(data) {
  return request('/knowledge', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateKnowledgeDoc(id, data) {
  return request(`/knowledge/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteKnowledgeDoc(id) {
  return request(`/knowledge/${id}`, { method: 'DELETE' });
}
