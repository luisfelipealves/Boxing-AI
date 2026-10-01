import { describe, expect, it } from 'vitest';
import {
  LABEL_PRINT_CONFIG,
  MILLIMETERS_PER_INCH,
  millimetersToMils,
  buildBoxQrValue,
} from './labelPrintConfig';

describe('Niimbot B1 Pro label print config', () => {
  it('uses the fixed 50 × 30 mm physical label size', () => {
    expect(LABEL_PRINT_CONFIG.printerName).toBe('Niimbot B1 Pro');
    expect(LABEL_PRINT_CONFIG.widthMm).toBe(50);
    expect(LABEL_PRINT_CONFIG.heightMm).toBe(30);
    expect(LABEL_PRINT_CONFIG.cssPageSize).toBe('50mm 30mm');
    expect(LABEL_PRINT_CONFIG.cssWidth).toBe('50mm');
    expect(LABEL_PRINT_CONFIG.cssHeight).toBe('30mm');
  });

  it('converts the label dimensions to Android mils for custom media size', () => {
    expect(MILLIMETERS_PER_INCH).toBe(25.4);
    expect(millimetersToMils(50)).toBe(1969);
    expect(millimetersToMils(30)).toBe(1181);
    expect(LABEL_PRINT_CONFIG.androidWidthMils).toBe(1969);
    expect(LABEL_PRINT_CONFIG.androidHeightMils).toBe(1181);
  });

  it('preserves the box QR route payload', () => {
    expect(buildBoxQrValue('https://example.test', '/inventory', 'box-123')).toBe(
      'https://example.test/inventory#/box/box-123',
    );
  });
});
