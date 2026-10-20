const BASE_URL = process.env.EXPO_PUBLIC_RESTAPI_LINK;

export async function apiRequest(path, options = {}) {
  if (!BASE_URL) {
    throw new Error('Missing EXPO_PUBLIC_RESTAPI_LINK in .env');
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}