import { describe, expect, it } from 'vitest';
import { LABEL_PRINT_CONFIG, buildBoxQrValue } from './labelPrintConfig';
import {
  B1_PRO_50X30_PROFILE,
  NIIMBOT_B1_MODEL_ID,
  NIIMBOT_B1_PRO_MODEL_ID,
  NIIMBOT_B1_PRO_CHARACTERISTIC_UUID,
  NIIMBOT_B1_PRO_SERVICE_UUID,
  type NiimbotBridgeErrorCode,
  type NiimbotBridgePrintOptions,
  type NiimbotBridgePrintResult,
  type NiimbotBridgeSelectedPrinter,
  assertSupportedNiimbotModel,
  getNiimbotModelSupport,
  isSupportedNiimbotModel,
} from './niimbot';

describe('Niimbot B1 Pro label print config', () => {
  it('centralizes the direct BLE 50 × 30 mm B1 Pro profile constants', () => {
    expect(B1_PRO_50X30_PROFILE).toMatchObject({
      id: 'niimbot-b1-pro-50x30',
      printerName: 'Niimbot B1 Pro',
      labelName: '50 × 30 mm',
      widthMm: 50,
      heightMm: 30,
      dpi: 300,
      rasterWidthPx: 576,
      rasterHeightPx: 354,
      modelId: 4097,
      protocolTask: 'v4',
      density: 3,
      labelType: 1,
      speed: 1,
      marginTopPx: 0,
      marginRightPx: 0,
      marginBottomPx: 0,
      marginLeftPx: 0,
      serviceUuid: 'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
      characteristicUuid: 'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f',
    });
    expect(NIIMBOT_B1_PRO_SERVICE_UUID).toBe(B1_PRO_50X30_PROFILE.serviceUuid);
    expect(NIIMBOT_B1_PRO_CHARACTERISTIC_UUID).toBe(B1_PRO_50X30_PROFILE.characteristicUuid);
  });

  it('keeps Android Print Framework media-size fields out of the supported B1 Pro path', () => {
    expect(LABEL_PRINT_CONFIG).toMatchObject({
      printerName: 'Niimbot B1 Pro',
      widthMm: 50,
      heightMm: 30,
      cssPageSize: '50mm 30mm',
      cssWidth: '50mm',
      cssHeight: '30mm',
      qrSizeMm: 17,
      directBleProfile: B1_PRO_50X30_PROFILE,
    });
    expect(LABEL_PRINT_CONFIG).not.toHaveProperty('androidMediaSizeId');
    expect(LABEL_PRINT_CONFIG).not.toHaveProperty('androidWidthMils');
    expect(LABEL_PRINT_CONFIG).not.toHaveProperty('androidHeightMils');
  });

  it('preserves the box QR route payload', () => {
    expect(buildBoxQrValue('https://example.test', '/inventory', 'box-123')).toBe(
      'https://example.test/inventory#/box/box-123',
    );
  });

  it('accepts B1 Pro model id and rejects B1 or unknown models explicitly', () => {
    expect(NIIMBOT_B1_PRO_MODEL_ID).toBe(4097);
    expect(NIIMBOT_B1_MODEL_ID).toBe(4096);
    expect(isSupportedNiimbotModel(4097)).toBe(true);
    expect(isSupportedNiimbotModel(4096)).toBe(false);
    expect(isSupportedNiimbotModel(1234)).toBe(false);

    expect(getNiimbotModelSupport(4097)).toEqual({
      supported: true,
      modelId: 4097,
      profile: B1_PRO_50X30_PROFILE,
    });
    expect(getNiimbotModelSupport(4096)).toEqual({
      supported: false,
      modelId: 4096,
      reason: 'unsupported-model',
      message: 'NIIMBOT B1 (model id 4096) is not supported. Use NIIMBOT B1 Pro (model id 4097).',
    });
    expect(getNiimbotModelSupport(1234)).toEqual({
      supported: false,
      modelId: 1234,
      reason: 'unsupported-model',
      message: 'NIIMBOT model id 1234 is not supported. Use NIIMBOT B1 Pro (model id 4097).',
    });
    expect(() => assertSupportedNiimbotModel(4096)).toThrow(/4096.*not supported/i);
  });

  it('defines stable bridge option and error contracts for native BLE printing', () => {
    const printOptions = {
      deviceId: 'android-device-id',
      profileId: B1_PRO_50X30_PROFILE.id,
      rasterBase64: 'AAAA',
      rasterWidthPx: B1_PRO_50X30_PROFILE.rasterWidthPx,
      rasterHeightPx: B1_PRO_50X30_PROFILE.rasterHeightPx,
      copies: 1,
    } satisfies NiimbotBridgePrintOptions;

    const supportedErrorCodes = [
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

    expect(printOptions).toMatchObject({
      profileId: 'niimbot-b1-pro-50x30',
      rasterWidthPx: 576,
      rasterHeightPx: 354,
    });
    const printResult = {
      jobId: 'niimbot-b1-pro-123',
      deviceId: 'android-device-id',
      modelId: NIIMBOT_B1_PRO_MODEL_ID,
      profileId: B1_PRO_50X30_PROFILE.id,
      status: 'success',
      confirmed: true,
      copies: 1,
    } satisfies NiimbotBridgePrintResult;

    expect(printResult).toMatchObject({ status: 'success', confirmed: true, copies: 1 });
    expect(supportedErrorCodes).toContain('unsupported-model');
    expect(supportedErrorCodes).toContain('unconfirmed-print');
  });

  it('defines persisted selected-printer metadata needed for display and reconnect', () => {
    const selectedPrinter = {
      deviceId: 'android-device-id',
      address: 'AA:BB:CC:DD:EE:FF',
      name: 'B1 Pro-I304050285',
      displayName: 'B1 Pro-I304050285',
      reconnectId: 'AA:BB:CC:DD:EE:FF',
      modelId: NIIMBOT_B1_PRO_MODEL_ID,
      profileId: B1_PRO_50X30_PROFILE.id,
      profile: B1_PRO_50X30_PROFILE,
      serviceUuid: NIIMBOT_B1_PRO_SERVICE_UUID,
      characteristicUuid: NIIMBOT_B1_PRO_CHARACTERISTIC_UUID,
      identifiedAt: '2026-10-01T00:00:00.000Z',
    } satisfies NiimbotBridgeSelectedPrinter;

    expect(selectedPrinter).toMatchObject({
      displayName: 'B1 Pro-I304050285',
      reconnectId: 'AA:BB:CC:DD:EE:FF',
      modelId: 4097,
      profileId: 'niimbot-b1-pro-50x30',
      serviceUuid: B1_PRO_50X30_PROFILE.serviceUuid,
      characteristicUuid: B1_PRO_50X30_PROFILE.characteristicUuid,
    });
  });
});
