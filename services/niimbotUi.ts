import {
  B1_PRO_50X30_PROFILE,
  type NiimbotBridgeError,
  type NiimbotBridgeErrorCode,
  type NiimbotBridgePermissionsResult,
  type NiimbotBridgePrintOptions,
} from './niimbot';

export const NIIMBOT_PRINT_PROGRESS_STEPS = [
  'permission/setup',
  'scanning',
  'identifying',
  'rendering',
  'sending',
  'printing/confirming',
  'success',
  'failure',
] as const;

export type NiimbotPrintProgressStep = (typeof NIIMBOT_PRINT_PROGRESS_STEPS)[number];

export interface NiimbotLabelSnapshot {
  readonly qrValue: string;
  readonly boxId: string;
  readonly boxNumber?: number;
  readonly boxName: string;
}

export interface NiimbotErrorPresentation {
  readonly title: string;
  readonly action: string;
  readonly recoverable: boolean;
  readonly unconfirmedPrint: boolean;
}

export const isNiimbotPermissionGranted = (permissions: NiimbotBridgePermissionsResult | null): boolean =>
  permissions?.bluetoothScan === 'granted' && permissions.bluetoothConnect === 'granted';

const ERROR_PRESENTATIONS: Record<NiimbotBridgeErrorCode, Omit<NiimbotErrorPresentation, 'recoverable' | 'unconfirmedPrint'>> = {
  'permission-denied': {
    title: 'Bluetooth permission is required',
    action: 'Grant Bluetooth nearby-device access so BoxTrack AI can find and connect directly to your NIIMBOT B1 Pro.',
  },
  'bluetooth-disabled': {
    title: 'Bluetooth is turned off',
    action: 'Turn on Bluetooth, keep the NIIMBOT B1 Pro nearby and powered on, then scan again.',
  },
  'bluetooth-unavailable': {
    title: 'Bluetooth is unavailable',
    action: 'Use an Android device with Bluetooth BLE support to print directly to the NIIMBOT B1 Pro.',
  },
  'scan-failed': {
    title: 'Could not scan for the B1 Pro',
    action: 'Check Bluetooth permissions, keep the printer awake, and scan again.',
  },
  'no-printer-found': {
    title: 'No NIIMBOT B1 Pro found',
    action: 'Power on the NIIMBOT B1 Pro, bring it closer, then rescan.',
  },
  'device-not-found': {
    title: 'Selected printer was not found',
    action: 'Make sure the saved NIIMBOT B1 Pro is powered on and nearby, or choose another printer.',
  },
  'connection-failed': {
    title: 'Could not connect to the printer',
    action: 'Keep the NIIMBOT B1 Pro awake and nearby, then reconnect or rescan.',
  },
  'identification-failed': {
    title: 'Could not prepare the B1 Pro',
    action: 'Reconnect after confirming the NIIMBOT B1 Pro is powered on, awake, and exposing its BLE print service.',
  },
  'unsupported-model': {
    title: 'This printer is not supported',
    action: 'Use a NIIMBOT B1 Pro. B1 and other NIIMBOT models are rejected for this direct BLE flow.',
  },
  'missing-gatt-service': {
    title: 'B1 Pro BLE service was not found',
    action: 'Restart the printer, reconnect, and verify this is a NIIMBOT B1 Pro.',
  },
  'missing-gatt-characteristic': {
    title: 'B1 Pro BLE print characteristic was not found',
    action: 'Restart the printer, reconnect, and try again with the NIIMBOT B1 Pro selected.',
  },
  'invalid-raster': {
    title: 'Label rendering is not ready',
    action: 'Retry after the label renders at the configured 50 × 30 mm, 576 × 354 px B1 Pro profile.',
  },
  'transmission-failed': {
    title: 'Could not send the label',
    action: 'Keep the phone close to the NIIMBOT B1 Pro and retry the same label. If transfer had already started, inspect the physical label before retrying.',
  },
  'printer-status': {
    title: 'Printer needs attention',
    action: 'Check paper, lid, battery, and busy status on the NIIMBOT B1 Pro, then retry.',
  },
  timeout: {
    title: 'Printer timed out',
    action: 'Wake the NIIMBOT B1 Pro, keep it nearby, and retry the same label.',
  },
  disconnect: {
    title: 'Printer disconnected',
    action: 'Reconnect to the NIIMBOT B1 Pro and retry the same label.',
  },
  'unconfirmed-print': {
    title: 'Print result is unconfirmed',
    action: 'The label transfer had already started. Inspect the physical label before retrying the same label.',
  },
  cancelled: {
    title: 'Printing was cancelled',
    action: 'Start the direct NIIMBOT B1 Pro print again when you are ready.',
  },
};

export const getNiimbotErrorPresentation = (error: NiimbotBridgeError): NiimbotErrorPresentation => {
  const fallback = ERROR_PRESENTATIONS['transmission-failed'];
  const base = ERROR_PRESENTATIONS[error.code] ?? fallback;
  return {
    ...base,
    recoverable: error.recoverable !== false && error.code !== 'bluetooth-unavailable' && error.code !== 'unsupported-model',
    unconfirmedPrint: error.code === 'unconfirmed-print',
  };
};

export const getNiimbotBleDiagnostic = (error: NiimbotBridgeError | null | undefined): string | null => {
  if (!error) return null;
  if (error.diagnostic) return `BLE diagnostic: ${error.diagnostic}`;

  const parts = [
    error.stage ? `stage=${error.stage}` : null,
    error.deviceId ? `device=${error.deviceId}` : null,
    typeof error.gattStatus === 'number' ? `gattStatus=${error.gattStatus}` : null,
    typeof error.bleState === 'number' ? `bleState=${error.bleState}` : null,
  ].filter((part): part is string => Boolean(part));

  return parts.length > 0 ? `BLE diagnostic: ${parts.join('; ')}` : null;
};

export const buildNiimbotPrintRequest = (
  deviceId: string,
  _labelSnapshot: NiimbotLabelSnapshot,
): NiimbotBridgePrintOptions => ({
  deviceId,
  profileId: B1_PRO_50X30_PROFILE.id,
  rasterBase64: '',
  rasterWidthPx: B1_PRO_50X30_PROFILE.rasterWidthPx,
  rasterHeightPx: B1_PRO_50X30_PROFILE.rasterHeightPx,
  copies: 1,
});
