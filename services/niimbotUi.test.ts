import { describe, expect, it } from 'vitest';
import { B1_PRO_50X30_PROFILE, type NiimbotBridgeErrorCode } from './niimbot';
import {
  NIIMBOT_PRINT_PROGRESS_STEPS,
  buildNiimbotPrintRequest,
  getNiimbotErrorPresentation,
  isNiimbotPermissionGranted,
} from './niimbotUi';

describe('Niimbot B1 Pro print UI helpers', () => {
  it('lists every setup and print progress state the Android flow can show', () => {
    expect(NIIMBOT_PRINT_PROGRESS_STEPS).toEqual([
      'permission/setup',
      'scanning',
      'connecting',
      'identifying',
      'rendering',
      'sending',
      'printing/confirming',
      'success',
      'failure',
    ]);
  });

  it('provides actionable copy for every PD-010 failure class', () => {
    const codes = [
      'permission-denied',
      'bluetooth-disabled',
      'bluetooth-unavailable',
      'scan-failed',
      'no-printer-found',
      'device-not-found',
      'connection-failed',
      'identification-failed',
      'unsupported-model',
      'missing-gatt-service',
      'missing-gatt-characteristic',
      'invalid-raster',
      'transmission-failed',
      'printer-status',
      'timeout',
      'disconnect',
      'unconfirmed-print',
      'cancelled',
    ] satisfies NiimbotBridgeErrorCode[];

    for (const code of codes) {
      const presentation = getNiimbotErrorPresentation({ code, message: 'Native details', recoverable: true });
      expect(presentation.title.length).toBeGreaterThan(0);
      expect(presentation.action.length).toBeGreaterThan(0);
    }

    expect(getNiimbotErrorPresentation({ code: 'unconfirmed-print', message: 'Timed out' }).action).toMatch(
      /inspect the physical label before retrying/i,
    );
    expect(getNiimbotErrorPresentation({ code: 'transmission-failed', message: 'Write failed' }).action).toMatch(
      /inspect the physical label before retrying/i,
    );
  });

  it('requires scan and connect permissions to be granted before setup can proceed', () => {
    expect(isNiimbotPermissionGranted({ bluetoothScan: 'granted', bluetoothConnect: 'granted' })).toBe(true);
    expect(isNiimbotPermissionGranted({ bluetoothScan: 'granted', bluetoothConnect: 'prompt' })).toBe(false);
    expect(isNiimbotPermissionGranted({ bluetoothScan: 'denied', bluetoothConnect: 'granted' })).toBe(false);
  });

  it('builds a stable print request without mutating selected label content between retries', () => {
    const label = Object.freeze({
      qrValue: 'https://example.test/app#/box/box-123',
      boxId: 'box-123',
      boxNumber: 42,
      boxName: 'Winter clothes',
    });

    const firstRequest = buildNiimbotPrintRequest('AA:BB:CC:DD:EE:FF', label);
    const retryRequest = buildNiimbotPrintRequest('AA:BB:CC:DD:EE:FF', label);

    expect(firstRequest).toEqual(retryRequest);
    expect(firstRequest).toMatchObject({
      deviceId: 'AA:BB:CC:DD:EE:FF',
      profileId: B1_PRO_50X30_PROFILE.id,
      rasterBase64: '',
      rasterWidthPx: B1_PRO_50X30_PROFILE.rasterWidthPx,
      rasterHeightPx: B1_PRO_50X30_PROFILE.rasterHeightPx,
      copies: 1,
    });
  });
});
