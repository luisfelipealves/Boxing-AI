import { describe, expect, it } from 'vitest';
import type { Box } from '../types';
import { buildBoxQrValue } from './labelPrintConfig';
import { B1_PRO_50X30_PROFILE } from './niimbot';
import {
  LabelRasterRenderError,
  packMonochromeRows,
  renderBoxLabelRaster,
  thresholdRgbaToMonochrome,
} from './labelRasterRenderer';

const box = (overrides: Partial<Box> = {}): Box => ({
  id: 'box-123',
  boxNumber: 42,
  locationId: 'loc-1',
  categoryId: 'cat-1',
  name: 'Camping Gear',
  ...overrides,
});

describe('label raster renderer', () => {
  it('renders the default B1 Pro profile to exactly 576 × 354 packed monochrome pixels', () => {
    const rendered = renderBoxLabelRaster({
      box: box(),
      origin: 'https://example.test',
      pathname: '/inventory',
      profile: B1_PRO_50X30_PROFILE,
    });

    expect(rendered).toMatchObject({
      widthPx: 576,
      heightPx: 354,
      bytesPerRow: 72,
      profileId: B1_PRO_50X30_PROFILE.id,
      qrValue: buildBoxQrValue('https://example.test', '/inventory', 'box-123'),
      boxNumberText: '#42',
      boxNameText: 'Camping Gear',
    });
    expect(rendered.pixels).toHaveLength(576 * 354);
    expect(rendered.packedRows).toHaveLength(72 * 354);
    expect(rendered.rasterBase64).toBe(Buffer.from(rendered.packedRows).toString('base64'));

    const blackPixels = rendered.pixels.reduce((sum, pixel) => sum + pixel, 0);
    expect(blackPixels).toBeGreaterThan(20_000);
    expect(blackPixels).toBeLessThan(90_000);
  });

  it('renders browser-safe base64 when Node Buffer is unavailable', () => {
    const globals = globalThis as typeof globalThis & { Buffer?: typeof Buffer };
    const originalBuffer = globals.Buffer;
    Object.defineProperty(globalThis, 'Buffer', {
      configurable: true,
      writable: true,
      value: undefined,
    });

    try {
      const rendered = renderBoxLabelRaster({
        box: box(),
        origin: 'https://example.test',
        pathname: '/inventory',
        profile: B1_PRO_50X30_PROFILE,
      });

      expect(rendered.rasterBase64).toMatch(/^[A-Za-z0-9+/]+={0,2}$/);
      expect(rendered.rasterBase64.length).toBeGreaterThan(0);
    } finally {
      Object.defineProperty(globalThis, 'Buffer', {
        configurable: true,
        writable: true,
        value: originalBuffer,
      });
    }
  });

  it('fails clearly when asked to render an unsupported profile geometry', () => {
    expect(() =>
      renderBoxLabelRaster({
        box: box(),
        origin: 'https://example.test',
        pathname: '/inventory',
        profile: { ...B1_PRO_50X30_PROFILE, id: 'future-size', rasterWidthPx: 640 },
      }),
    ).toThrow(LabelRasterRenderError);

    try {
      renderBoxLabelRaster({
        box: box(),
        origin: 'https://example.test',
        pathname: '/inventory',
        profile: { ...B1_PRO_50X30_PROFILE, id: 'future-size', rasterWidthPx: 640 },
      });
    } catch (error) {
      expect(error).toMatchObject({ code: 'profile-mismatch' });
    }
  });

  it('preserves QR payload semantics and fails deterministically without a box number', () => {
    expect(() =>
      renderBoxLabelRaster({
        box: box({ boxNumber: undefined }),
        origin: 'https://example.test',
        pathname: '/inventory',
      }),
    ).toThrow(LabelRasterRenderError);

    try {
      renderBoxLabelRaster({
        box: box({ boxNumber: undefined }),
        origin: 'https://example.test',
        pathname: '/inventory',
      });
    } catch (error) {
      expect(error).toMatchObject({ code: 'missing-box-number' });
    }
  });

  it('omits unsafe long names while keeping the stable box number', () => {
    const rendered = renderBoxLabelRaster({
      box: box({ name: 'A'.repeat(80) }),
      origin: 'https://example.test',
      pathname: '/inventory',
    });

    expect(rendered.boxNumberText).toBe('#42');
    expect(rendered.boxNameText).toBeUndefined();
  });

  it('packs monochrome bitmap rows MSB-first with row padding for NIIMBOT transfer', () => {
    const packed = packMonochromeRows({
      widthPx: 10,
      heightPx: 2,
      pixels: Uint8Array.from([
        1, 0, 1, 0, 0, 0, 0, 1, 1, 0,
        0, 1, 0, 1, 1, 1, 1, 0, 0, 1,
      ]),
    });

    expect([...packed]).toEqual([0b1010_0001, 0b1000_0000, 0b0101_1110, 0b0100_0000]);
  });

  it('converts RGBA source data to deterministic high-contrast thermal monochrome', () => {
    const monochrome = thresholdRgbaToMonochrome({
      widthPx: 4,
      heightPx: 1,
      rgba: Uint8ClampedArray.from([
        0, 0, 0, 255,
        255, 255, 255, 255,
        180, 180, 180, 255,
        0, 0, 0, 0,
      ]),
      threshold: 192,
    });

    expect([...monochrome]).toEqual([1, 0, 1, 0]);
  });
});
