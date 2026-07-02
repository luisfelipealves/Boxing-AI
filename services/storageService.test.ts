import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getLocations, updateLocation } from './storageService';

describe('storageService local backend integration', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('loads locations from the local API', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [{ id: 'loc-1', user_id: 'local-user', name: 'Garage', description: 'Main storage' }],
    } as Response);

    const locations = await getLocations();

    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/locations'), expect.any(Object));
    expect(locations).toHaveLength(1);
    expect(locations[0].name).toBe('Garage');
  });

  it('updates a location through the local API', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'loc-1', user_id: 'local-user', name: 'Garage Updated', description: 'Updated' }),
    } as Response);

    const updatedLocation = await updateLocation({ id: 'loc-1', user_id: 'local-user', name: 'Garage Updated', description: 'Updated' });

    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/locations/loc-1'), expect.objectContaining({ method: 'PUT' }));
    expect(updatedLocation.name).toBe('Garage Updated');
  });
});
