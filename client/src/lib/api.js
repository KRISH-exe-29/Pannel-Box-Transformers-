const API_BASE = 'http://localhost:5000';

function getAuthHeaders() {
  const token = localStorage.getItem('rtcc_jwt_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
}

window.addEventListener('auth-unauthorized', () => {
  // Event listener kept for compatibility with AuthContext logout trigger
});

const REQUEST_TIMEOUT_MS = 15000; // 15 second timeout for all API requests

async function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    return response;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Request timed out. Please check your internet connection and try again.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function handleResponse(response) {
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401) {
      window.dispatchEvent(new CustomEvent('auth-unauthorized'));
    }
    const errorMessage = data?.error || data?.message || `Request failed with status ${response.status}`;
    throw new Error(errorMessage);
  }
  return data;
}

const api = {
  async get(url) {
    const headers = getAuthHeaders();
    const response = await fetchWithTimeout(url, {
      method: 'GET',
      headers
    });
    return handleResponse(response);
  },

  async post(url, body) {
    const headers = getAuthHeaders();
    const response = await fetchWithTimeout(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });
    return handleResponse(response);
  },

  async put(url, body) {
    const headers = getAuthHeaders();
    const response = await fetchWithTimeout(url, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body)
    });
    return handleResponse(response);
  },

  async del(url) {
    const headers = getAuthHeaders();
    const response = await fetchWithTimeout(url, {
      method: 'DELETE',
      headers
    });
    return handleResponse(response);
  }
};

export default api;
