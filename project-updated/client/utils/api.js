// API Configuration
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'https://project-bartender-production.up.railway.app'
    : 'http://localhost:5000');

// Helper function for API calls
export const apiCall = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;

  const isBrowser = typeof window !== 'undefined';
  const token = isBrowser ? window.localStorage.getItem('token') : null;

  // Determine if body is FormData to avoid setting Content-Type
  const isFormData = options && options.body && typeof FormData !== 'undefined' && options.body instanceof FormData;

  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...options.headers,
  };

  // Add auth token if available (both headers for compatibility)
  if (token) {
    headers['x-auth-token'] = token;
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, { ...options, headers, credentials: 'include' });

  if (!response.ok) {
    // Try to parse error body for better message
    let message = `API call failed: ${response.status}`;
    try {
      const data = await response.json();
      if (data && (data.error || data.msg || data.message)) {
        message = data.error || data.msg || data.message;
      }
    } catch (_) {}
    throw new Error(message);
  }

  // Some endpoints may return empty body (204)
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  return response.text();
};

// Auth API calls
export const authAPI = {
  me: () => apiCall('/api/auth/me'),
  login: (credentials) => apiCall('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials)
  }),
  register: (userData) => apiCall('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData)
  })
};

// Admin API calls
export const adminAPI = {
  dashboard: () => apiCall('/api/admin/dashboard'),
  users: () => apiCall('/api/admin/users'),
  prizes: () => apiCall('/api/admin/prizes'),
  sales: () => apiCall('/api/admin/sales'),
  transactions: () => apiCall('/api/admin/transactions'),
  createPrize: (prizeData) => apiCall('/api/admin/prizes', {
    method: 'POST',
    body: JSON.stringify(prizeData)
  })
};

// Sales API calls
export const salesAPI = {
  stats: () => apiCall('/api/sales/stats'),
  // Pass FormData directly; headers handled in apiCall
  create: (formData) => apiCall('/api/sales', {
    method: 'POST',
    body: formData
  })
};