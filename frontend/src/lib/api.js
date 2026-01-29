/**
 * API Client for Mercury Backend
 * Handles all HTTP requests with authentication and error handling
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

const TOKEN_KEY = 'nova_token';
/**
 * Get the stored auth token
 */
export function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Set the auth token
 */
export function setToken(token) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
}

/**
 * Remove the auth token
 */
export function removeToken() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Main fetch wrapper with auth and error handling
 */
async function fetchApi(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add auth token if available
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  // Convert body to JSON if it's an object
  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  try {
    const response = await fetch(url, config);

    // Parse JSON response (or empty object for 204)
    let data = null;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    }

    // Handle error responses
    if (!response.ok) {
      const message = data?.message || data?.error || `Request failed with status ${response.status}`;
      
      if (response.status === 401) {
        removeToken();
      }

      throw new ApiError(message, response.status, data);
    }

    return data;
  } catch (error) {
    // Re-throw ApiErrors as-is
    if (error instanceof ApiError) {
      throw error;
    }
    // Wrap network errors
    throw new ApiError(
      error.message || 'Network error occurred',
      0,
      null
    );
  }
}

/**
 * API methods organized by resource
 */
export const api = {
  // Auth endpoints
  auth: {
    login: (email, password) =>
      fetchApi('/auth/login', {
        method: 'POST',
        body: { email, password },
      }),

    register: (data) =>
      fetchApi('/auth/register', {
        method: 'POST',
        body: data,
      }),

    me: () =>
      fetchApi('/auth/me'),

    updateProfile: (data) =>
      fetchApi('/auth/profile', {
        method: 'PUT',
        body: data,
      }),
  },

  // Dashboard endpoints
  dashboard: {
    stats: () =>
      fetchApi('/dashboard/stats'),

    recent: (limit = 5) =>
      fetchApi(`/dashboard/recent?limit=${limit}`),

    cashouts: (limit = 10) =>
      fetchApi(`/dashboard/cashouts?limit=${limit}`),
  },

  // Invoice endpoints
  invoices: {
    list: (params = {}) => {
      const query = new URLSearchParams();
      if (params.page) query.set('page', params.page);
      if (params.limit) query.set('limit', params.limit);
      if (params.status) query.set('status', params.status);
      const queryString = query.toString();
      return fetchApi(`/invoices${queryString ? `?${queryString}` : ''}`);
    },

    get: (id) =>
      fetchApi(`/invoices/${id}`),

    create: (data) =>
      fetchApi('/invoices', {
        method: 'POST',
        body: data,
      }),

    update: (id, data) =>
      fetchApi(`/invoices/${id}`, {
        method: 'PUT',
        body: data,
      }),

    delete: (id) =>
      fetchApi(`/invoices/${id}`, {
        method: 'DELETE',
      }),

    send: (id) =>
      fetchApi(`/invoices/${id}/send`, {
        method: 'POST',
      }),

    cancel: (id) =>
      fetchApi(`/invoices/${id}/cancel`, {
        method: 'POST',
      }),

    checkPayment: (id) =>
      fetchApi(`/invoices/${id}/check-payment`, {
        method: 'POST',
      }),

    simulatePayment: (id, chain) =>
      fetchApi(`/invoices/${id}/simulate-payment`, {
        method: 'POST',
        body: { chain },
      }),

    getPipelineStatus: (id) =>
      fetchApi(`/invoices/${id}/pipeline-status`),
  },

  // Public endpoints (no auth required)
  public: {
    getInvoice: (id) =>
      fetchApi(`/public/invoice/${id}`),

    getQrData: (id) =>
      fetchApi(`/public/invoice/${id}/qr-data`),

    checkPayment: (id) =>
      fetchApi(`/public/invoice/${id}/check-payment`, {
        method: 'POST',
      }),

    getPipelineStatus: (id) =>
      fetchApi(`/public/invoice/${id}/pipeline`),

    getRates: () =>
      fetchApi('/public/rates'),
  },

  // Settings endpoints
  settings: {
    get: () =>
      fetchApi('/settings'),

    getPayoutAddresses: () =>
      fetchApi('/settings/payout-addresses'),

    updatePayoutAddresses: (addresses) =>
      fetchApi('/settings/payout-addresses', {
        method: 'PUT',
        body: addresses,
      }),

    getNessie: () =>
      fetchApi('/settings/nessie'),

    updateNessie: (accountId) =>
      fetchApi('/settings/nessie', {
        method: 'PUT',
        body: { accountId },
      }),

    getNessieBalance: () =>
      fetchApi('/settings/nessie/balance'),

    getNessieTransactions: (limit = 20) =>
      fetchApi(`/settings/nessie/transactions?limit=${limit}`),

    getNessieCustomer: () =>
      fetchApi('/settings/nessie/customer'),

    provisionNessie: (data = {}) =>
      fetchApi('/settings/nessie/provision', {
        method: 'POST',
        body: data,
      }),

    discoverNessieAccounts: () =>
      fetchApi('/settings/nessie/discover'),

    getDefaults: () =>
      fetchApi('/settings/defaults'),

    updateDefaults: (defaults) =>
      fetchApi('/settings/defaults', {
        method: 'PUT',
        body: defaults,
      }),
  },
};

export default api;
