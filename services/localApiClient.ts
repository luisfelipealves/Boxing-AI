const normalizeApiUrl = (value: string | undefined): string | undefined => {
  if (!value || value === 'undefined' || value.trim() === '') return undefined;
  return value.replace(/\/$/, '');
};

const resolveApiUrl = (): string => {
  const fromEnv = typeof import.meta !== 'undefined'
    ? normalizeApiUrl((import.meta as any).env?.VITE_API_URL)
    : undefined;

  const fromProcess = typeof process !== 'undefined'
    ? normalizeApiUrl(process.env?.VITE_API_URL)
    : undefined;

  return fromEnv || fromProcess || 'http://localhost:3001';
};

const API_URL = resolveApiUrl();

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const baseUrl = API_URL.endsWith('/') ? API_URL : `${API_URL}/`;
  const url = `${baseUrl}${path.replace(/^\//, '')}`;
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Local API request failed');
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
};

export const localApi = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) => request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (path: string) => request<void>(path, { method: 'DELETE' }),
};
