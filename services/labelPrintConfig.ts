import { B1_PRO_50X30_PROFILE } from './niimbot';

export const LABEL_PRINT_CONFIG = {
  printerName: B1_PRO_50X30_PROFILE.printerName,
  widthMm: B1_PRO_50X30_PROFILE.widthMm,
  heightMm: B1_PRO_50X30_PROFILE.heightMm,
  cssPageSize: `${B1_PRO_50X30_PROFILE.widthMm}mm ${B1_PRO_50X30_PROFILE.heightMm}mm`,
  cssWidth: `${B1_PRO_50X30_PROFILE.widthMm}mm`,
  cssHeight: `${B1_PRO_50X30_PROFILE.heightMm}mm`,
  qrSizeMm: 17,
  directBleProfile: B1_PRO_50X30_PROFILE,
} as const;

export const buildBoxQrValue = (origin: string, pathname: string, boxId: string): string =>
  `${origin}${pathname}#/box/${boxId}`;
