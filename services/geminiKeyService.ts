const GEMINI_API_KEY_STORAGE_KEY = 'boxtrack.gemini.api-key';

const readStoredGeminiApiKey = (): string => {
  if (typeof window === 'undefined') return '';

  try {
    return window.localStorage.getItem(GEMINI_API_KEY_STORAGE_KEY)?.trim() || '';
  } catch {
    return '';
  }
};

export const getGeminiApiKey = (): string => {
  const envApiKey = import.meta.env.VITE_GOOGLE_GENAI_API_KEY?.trim();
  return envApiKey || readStoredGeminiApiKey();
};

export const setStoredGeminiApiKey = (apiKey: string): boolean => {
  const normalizedApiKey = apiKey.trim();
  if (!normalizedApiKey || typeof window === 'undefined') return false;

  try {
    window.localStorage.setItem(GEMINI_API_KEY_STORAGE_KEY, normalizedApiKey);
    return true;
  } catch {
    return false;
  }
};

export const clearStoredGeminiApiKey = (): void => {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.removeItem(GEMINI_API_KEY_STORAGE_KEY);
  } catch {
    // Ignore storage errors so the rest of the app can continue to work.
  }
};
