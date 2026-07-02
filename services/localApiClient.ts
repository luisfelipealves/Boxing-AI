const normalizeApiUrl = (value: string | undefined): string | undefined => {
  if (!value || value === 'undefined' || value.trim() === '') return undefined;
  return value.replace(/\/$/, '');
};

export const resolveApiUrl = (): string => {
  const fromEnv = typeof import.meta !== 'undefined'
    ? normalizeApiUrl((import.meta as any).env?.VITE_API_URL)
    : undefined;

  const fromProcess = typeof process !== 'undefined'
    ? normalizeApiUrl(process.env?.VITE_API_URL)
    : undefined;

  if (fromEnv) return fromEnv;
  if (fromProcess) return fromProcess;
  return '/api';
};

const API_URL = resolveApiUrl();
const STORAGE_KEY = 'boxtrack-local-data';

type StoredData = {
  locations: any[];
  boxes: any[];
  items: any[];
};

const readStoredData = (): StoredData => {
  if (typeof window === 'undefined') return { locations: [], boxes: [], items: [] };

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return { locations: [], boxes: [], items: [] };

  try {
    const parsed = JSON.parse(raw) as Partial<StoredData>;
    return {
      locations: Array.isArray(parsed.locations) ? parsed.locations : [],
      boxes: Array.isArray(parsed.boxes) ? parsed.boxes : [],
      items: Array.isArray(parsed.items) ? parsed.items : [],
    };
  } catch {
    return { locations: [], boxes: [], items: [] };
  }
};

const writeStoredData = (data: StoredData) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

const getFallbackData = <T>(path: string): T | undefined => {
  const normalizedPath = path.replace(/^\//, '');
  const [resource, second, third] = normalizedPath.split('/');
  const store = readStoredData();

  if (resource === 'locations') {
    if (second) {
      return store.locations.find((item) => item.id === second) as T;
    }
    return store.locations as T;
  }

  if (resource === 'boxes') {
    if (second) {
      return store.boxes.find((item) => item.id === second) as T;
    }
    return store.boxes as T;
  }

  if (resource === 'items') {
    if (second === 'box' && third) {
      return store.items.filter((item) => item.box_id === third) as T;
    }
    if (second) {
      return store.items.find((item) => item.id === second) as T;
    }
    return store.items as T;
  }

  return undefined;
};

const updateFallbackData = (path: string, method: string, body?: unknown) => {
  const normalizedPath = path.replace(/^\//, '');
  const [resource, second, third] = normalizedPath.split('/');
  const store = readStoredData();

  if (resource === 'locations') {
    if (method === 'POST') {
      const payload = body as Record<string, any>;
      const created = { ...payload, created_at: payload.created_at ?? Date.now() };
      store.locations = [...store.locations, created];
      writeStoredData(store);
      return created;
    }

    if (method === 'PUT' && second) {
      store.locations = store.locations.map((item) => (item.id === second ? { ...item, ...(body as Record<string, any>) } : item));
      writeStoredData(store);
      return store.locations.find((item) => item.id === second);
    }

    if (method === 'DELETE' && second) {
      store.locations = store.locations.filter((item) => item.id !== second);
      writeStoredData(store);
      return undefined;
    }
  }

  if (resource === 'boxes') {
    if (method === 'POST') {
      const payload = body as Record<string, any>;
      const created = { ...payload, created_at: payload.created_at ?? Date.now() };
      store.boxes = [...store.boxes, created];
      writeStoredData(store);
      return created;
    }

    if (method === 'PUT' && second) {
      store.boxes = store.boxes.map((item) => (item.id === second ? { ...item, ...(body as Record<string, any>) } : item));
      writeStoredData(store);
      return store.boxes.find((item) => item.id === second);
    }

    if (method === 'DELETE' && second) {
      store.boxes = store.boxes.filter((item) => item.id !== second);
      writeStoredData(store);
      return undefined;
    }
  }

  if (resource === 'items') {
    if (method === 'POST') {
      const payload = body as Record<string, any>;
      const created = { ...payload, created_at: payload.created_at ?? Date.now() };
      store.items = [...store.items, created];
      writeStoredData(store);
      return created;
    }

    if (method === 'PUT' && second === 'move' && third) {
      store.items = store.items.map((item) => (item.id === third ? { ...item, box_id: (body as Record<string, any>).box_id } : item));
      writeStoredData(store);
      return store.items.find((item) => item.id === third);
    }

    if (method === 'PUT' && second) {
      store.items = store.items.map((item) => (item.id === second ? { ...item, ...(body as Record<string, any>) } : item));
      writeStoredData(store);
      return store.items.find((item) => item.id === second);
    }

    if (method === 'DELETE' && second) {
      store.items = store.items.filter((item) => item.id !== second);
      writeStoredData(store);
      return undefined;
    }
  }

  return undefined;
};

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const baseUrl = API_URL.endsWith('/') ? API_URL : `${API_URL}/`;
  const url = `${baseUrl}${path.replace(/^\//, '')}`;

  try {
    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
    });

    if (!response.ok) {
      const fallback = getFallbackData<T>(path);
      if (fallback !== undefined) return fallback;

      const message = await response.text();
      throw new Error(message || 'Local API request failed');
    }

    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  } catch (error) {
    const fallback = getFallbackData<T>(path);
    if (fallback !== undefined) return fallback;

    if (init?.method && ['POST', 'PUT', 'DELETE'].includes(init.method.toUpperCase())) {
      const fallbackResult = updateFallbackData(path, init.method.toUpperCase(), init.body ? JSON.parse(init.body as string) : undefined);
      if (fallbackResult !== undefined) return fallbackResult as T;
    }

    throw error;
  }
};

export const localApi = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) => request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (path: string) => request<void>(path, { method: 'DELETE' }),
};
