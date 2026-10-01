export const NIIMBOT_B1_MODEL_ID = 4096;
export const NIIMBOT_B1_PRO_MODEL_ID = 4097;

export const NIIMBOT_B1_PRO_SERVICE_UUID = 'e7810a71-73ae-499d-8c15-faa9aef0c3f2';
export const NIIMBOT_B1_PRO_CHARACTERISTIC_UUID = 'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f';

export type NiimbotProtocolTask = 'v4';

export interface NiimbotLabelProfile {
  readonly id: string;
  readonly printerName: string;
  readonly labelName: string;
  readonly widthMm: number;
  readonly heightMm: number;
  readonly dpi: number;
  readonly rasterWidthPx: number;
  readonly rasterHeightPx: number;
  readonly modelId: number;
  readonly protocolTask: NiimbotProtocolTask;
  readonly density: number;
  readonly labelType: number;
  readonly speed: number;
  readonly marginTopPx: number;
  readonly marginRightPx: number;
  readonly marginBottomPx: number;
  readonly marginLeftPx: number;
  readonly serviceUuid: string;
  readonly characteristicUuid: string;
}

export const B1_PRO_50X30_PROFILE = {
  id: 'niimbot-b1-pro-50x30',
  printerName: 'Niimbot B1 Pro',
  labelName: '50 × 30 mm',
  widthMm: 50,
  heightMm: 30,
  dpi: 300,
  rasterWidthPx: 576,
  rasterHeightPx: 354,
  modelId: NIIMBOT_B1_PRO_MODEL_ID,
  protocolTask: 'v4',
  density: 3,
  labelType: 1,
  speed: 1,
  marginTopPx: 0,
  marginRightPx: 0,
  marginBottomPx: 0,
  marginLeftPx: 0,
  serviceUuid: NIIMBOT_B1_PRO_SERVICE_UUID,
  characteristicUuid: NIIMBOT_B1_PRO_CHARACTERISTIC_UUID,
} as const satisfies NiimbotLabelProfile;

export type NiimbotUnsupportedModelReason = 'unsupported-model';

export type NiimbotModelSupportResult =
  | { readonly supported: true; readonly modelId: typeof NIIMBOT_B1_PRO_MODEL_ID; readonly profile: typeof B1_PRO_50X30_PROFILE }
  | {
      readonly supported: false;
      readonly modelId: number;
      readonly reason: NiimbotUnsupportedModelReason;
      readonly message: string;
    };

export class NiimbotUnsupportedModelError extends Error {
  readonly reason: NiimbotUnsupportedModelReason = 'unsupported-model';
  readonly modelId: number;

  constructor(result: Extract<NiimbotModelSupportResult, { supported: false }>) {
    super(result.message);
    this.name = 'NiimbotUnsupportedModelError';
    this.modelId = result.modelId;
  }
}

export const isSupportedNiimbotModel = (modelId: number): modelId is typeof NIIMBOT_B1_PRO_MODEL_ID =>
  modelId === NIIMBOT_B1_PRO_MODEL_ID;

export const getNiimbotModelSupport = (modelId: number): NiimbotModelSupportResult => {
  if (isSupportedNiimbotModel(modelId)) {
    return { supported: true, modelId, profile: B1_PRO_50X30_PROFILE };
  }

  if (modelId === NIIMBOT_B1_MODEL_ID) {
    return {
      supported: false,
      modelId,
      reason: 'unsupported-model',
      message: 'NIIMBOT B1 (model id 4096) is not supported. Use NIIMBOT B1 Pro (model id 4097).',
    };
  }

  return {
    supported: false,
    modelId,
    reason: 'unsupported-model',
    message: `NIIMBOT model id ${modelId} is not supported. Use NIIMBOT B1 Pro (model id 4097).`,
  };
};

export const assertSupportedNiimbotModel = (modelId: number): typeof NIIMBOT_B1_PRO_MODEL_ID => {
  const result = getNiimbotModelSupport(modelId);
  if (!result.supported) {
    throw new NiimbotUnsupportedModelError(result);
  }
  return result.modelId;
};

export type NiimbotBridgePermissionState = 'granted' | 'denied' | 'prompt' | 'unavailable';

export interface NiimbotBridgePermissionsResult {
  readonly bluetoothScan: NiimbotBridgePermissionState;
  readonly bluetoothConnect: NiimbotBridgePermissionState;
  readonly location?: NiimbotBridgePermissionState;
}

export interface NiimbotBridgeDevice {
  readonly deviceId: string;
  readonly name?: string;
  readonly address?: string;
  readonly rssi?: number;
  readonly advertisedServiceUuids?: readonly string[];
}

export interface NiimbotBridgeIdentifiedPrinter extends NiimbotBridgeDevice {
  readonly modelId: typeof NIIMBOT_B1_PRO_MODEL_ID;
  readonly profile: typeof B1_PRO_50X30_PROFILE;
}

export interface NiimbotBridgeScanOptions {
  readonly serviceUuid?: string;
  readonly timeoutMs?: number;
}

export interface NiimbotBridgeConnectOptions {
  readonly deviceId: string;
  readonly timeoutMs?: number;
}

export interface NiimbotBridgePrintOptions {
  readonly deviceId: string;
  readonly profileId: typeof B1_PRO_50X30_PROFILE.id;
  readonly rasterBase64: string;
  readonly rasterWidthPx: typeof B1_PRO_50X30_PROFILE.rasterWidthPx;
  readonly rasterHeightPx: typeof B1_PRO_50X30_PROFILE.rasterHeightPx;
  readonly copies?: number;
  readonly timeoutMs?: number;
}

export type NiimbotBridgeErrorCode =
  | 'permission-denied'
  | 'bluetooth-disabled'
  | 'bluetooth-unavailable'
  | 'scan-failed'
  | 'no-printer-found'
  | 'device-not-found'
  | 'connection-failed'
  | 'identification-failed'
  | 'unsupported-model'
  | 'missing-gatt-service'
  | 'missing-gatt-characteristic'
  | 'invalid-raster'
  | 'transmission-failed'
  | 'printer-status'
  | 'timeout'
  | 'disconnect'
  | 'unconfirmed-print'
  | 'cancelled';

export interface NiimbotBridgeError {
  readonly code: NiimbotBridgeErrorCode;
  readonly message: string;
  readonly modelId?: number;
  readonly deviceId?: string;
  readonly recoverable?: boolean;
}

export type NiimbotBridgeResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: NiimbotBridgeError };

export interface NiimbotBridgePrintResult {
  readonly jobId: string;
  readonly deviceId: string;
  readonly modelId: typeof NIIMBOT_B1_PRO_MODEL_ID;
  readonly profileId: typeof B1_PRO_50X30_PROFILE.id;
  readonly confirmed: boolean;
}

export interface NiimbotNativeBlePrinterPlugin {
  checkPermissions(): Promise<NiimbotBridgeResult<NiimbotBridgePermissionsResult>>;
  requestPermissions(): Promise<NiimbotBridgeResult<NiimbotBridgePermissionsResult>>;
  scan(options?: NiimbotBridgeScanOptions): Promise<NiimbotBridgeResult<readonly NiimbotBridgeDevice[]>>;
  connect(options: NiimbotBridgeConnectOptions): Promise<NiimbotBridgeResult<NiimbotBridgeDevice>>;
  identify(options: NiimbotBridgeConnectOptions): Promise<NiimbotBridgeResult<NiimbotBridgeIdentifiedPrinter>>;
  printLabel(options: NiimbotBridgePrintOptions): Promise<NiimbotBridgeResult<NiimbotBridgePrintResult>>;
  disconnect(options: NiimbotBridgeConnectOptions): Promise<NiimbotBridgeResult<{ readonly deviceId: string }>>;
}
