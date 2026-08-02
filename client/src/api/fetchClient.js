const BASE_URL = 'http://localhost:5000/api/v1/auth';

export const fetchClient = async (endpoint, options = {}) => {
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  const config = {
    method: options.method || 'GET',
    headers: { ...defaultHeaders, ...options.headers },
    credentials: 'include',
    ...options,
  };

  if (options.body && typeof options.body !== 'string') {
    config.body = JSON.stringify(options.body);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, config);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong');
  }

  return data;
};