const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3005';

function getAuthToken(): string | null {
  return localStorage.getItem('auth_token');
}

async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers as Record<string, string>),
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `API Error: ${response.statusText}`);
  }

  return response.json();
}

export function isDemoMode(): boolean {
  return false;
}

export async function getDeclarations() {
  return apiFetch('/cds/declarations');
}

export async function getDeclaration(id: string) {
  return apiFetch(`/cds/declarations/${id}`);
}

export async function getClients() {
  return apiFetch('/clients');
}

export async function getClient(id: string) {
  return apiFetch(`/clients/${id}`);
}

export async function getClaims(options?: { limit?: number }) {
  const endpoint = options?.limit ? `/claims?limit=${options.limit}` : '/claims';
  return apiFetch(endpoint);
}

export async function getContacts(clientId?: string) {
  const endpoint = clientId ? `/contacts?client_id=${clientId}` : '/contacts';
  return apiFetch(endpoint);
}

export async function getDashboardStats() {
  const [manifest, claims] = await Promise.all([
    apiFetch('/cds/manifest/summary'),
    apiFetch('/claims/dashboard'),
  ]);

  return {
    total_declarations: manifest.totalDeclarations || manifest.total_declarations || 0,
    total_duty_paid: manifest.totalDutyPaid || manifest.total_duty_paid || 0,
    total_vat_paid:
      manifest.totalVatPaid ||
      manifest.total_vat_paid ||
      manifest.totalValue ||
      manifest.total_value ||
      0,
    total_claims: claims.total_claims || 0,
    pending_claims:
      (claims.by_status?.draft || 0) +
      (claims.by_status?.in_progress || 0) +
      (claims.by_status?.under_review || 0) +
      (claims.by_status?.submitted || 0),
    approved_claims: (claims.by_status?.approved || 0) + (claims.by_status?.paid || 0),
    potential_savings: claims.total_claimed || 0,
    by_status: claims.by_status || {},
  };
}

export async function login(email: string, password: string) {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error('Invalid credentials');
  }

  const data = await response.json();
  localStorage.setItem('auth_token', data.token);
  localStorage.setItem('current_user_email', email);

  return {
    success: true,
    mode: 'production',
    ...data,
  };
}

export async function register(data: {
  company_name: string;
  first_name: string;
  last_name: string;
  email: string;
  password: string;
}) {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Registration failed');
  }

  const result = await response.json();
  localStorage.setItem('auth_token', result.token);
  localStorage.setItem('current_user_email', data.email);

  return result;
}

export function logout() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('current_user_email');
}

export function isLoggedIn(): boolean {
  return !!getAuthToken();
}

export function getCurrentMode(): 'production' | null {
  return getAuthToken() ? 'production' : null;
}

export function showDemoIndicator(): boolean {
  return false;
}
