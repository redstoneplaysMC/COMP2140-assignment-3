const BASE_URL = process.env.EXPO_PUBLIC_RESTAPI_LINK;
const ACCESS_TOKEN = process.env.EXPO_PUBLIC_RESTAPI_ACCESS_TOKEN;

export async function apiRequest(path, options = {}) {
  if (!BASE_URL || !ACCESS_TOKEN) {
    throw new Error('Missing API configuration in .env');
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
        `API request failed: ${response.status} ${details}`
    );
  }

  if (response.status === 204) return null;

  return response.json();
}