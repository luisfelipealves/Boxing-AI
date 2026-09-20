import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearStoredGeminiApiKey, getGeminiApiKey, setStoredGeminiApiKey } from './geminiKeyService';

describe('geminiKeyService', () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
        removeItem: (key: string) => values.delete(key),
        clear: () => values.clear(),
      },
    });
    vi.stubEnv('VITE_GOOGLE_GENAI_API_KEY', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    window.localStorage.clear();
  });

  it('uses the environment key before the stored key', () => {
    window.localStorage.setItem('boxtrack.gemini.api-key', 'stored-key');
    vi.stubEnv('VITE_GOOGLE_GENAI_API_KEY', 'environment-key');

    expect(getGeminiApiKey()).toBe('environment-key');
  });

  it('falls back to the stored key when the environment is empty', () => {
    setStoredGeminiApiKey('  stored-key  ');

    expect(getGeminiApiKey()).toBe('stored-key');
  });

  it('can clear the stored key', () => {
    setStoredGeminiApiKey('stored-key');
    clearStoredGeminiApiKey();

    expect(getGeminiApiKey()).toBe('');
  });
});
