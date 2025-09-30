// API Configuration
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Helper function for API calls
export const apiCall = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  // Add auth token if available
  const token = localStorage.getItem('token');
  if (token) {
    defaultOptions.headers['x-auth-token'] = token;
  }

  const response = await fetch(url, { ...defaultOptions, ...options });
  
  if (!response.ok) {
    throw new Error(`API call failed: ${response.status}`);
  }
  
  return response.json();
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
  create: (saleData) => apiCall('/api/sales', {
    method: 'POST',
    body: JSON.stringify(saleData)
  })
};