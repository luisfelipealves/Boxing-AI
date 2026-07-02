import { describe, expect, it } from 'vitest';
import { resolveApiUrl } from './localApiClient';

describe('localApiClient', () => {
  it('uses a relative API path by default', () => {
    expect(resolveApiUrl()).toBe('/api');
  });
});
