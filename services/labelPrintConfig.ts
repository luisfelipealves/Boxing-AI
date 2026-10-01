export const MILLIMETERS_PER_INCH = 25.4;
const MILS_PER_INCH = 1000;

export const millimetersToMils = (millimeters: number): number =>
  Math.round((millimeters / MILLIMETERS_PER_INCH) * MILS_PER_INCH);

export const LABEL_PRINT_CONFIG = {
  printerName: 'Niimbot B1 Pro',
  widthMm: 50,
  heightMm: 30,
  cssPageSize: '50mm 30mm',
  cssWidth: '50mm',
  cssHeight: '30mm',
  qrSizeMm: 17,
  androidMediaSizeId: 'NIIMBOT_B1_PRO_50X30',
  androidWidthMils: millimetersToMils(50),
  androidHeightMils: millimetersToMils(30),
} as const;

export const buildBoxQrValue = (origin: string, pathname: string, boxId: string): string =>
  `${origin}${pathname}#/box/${boxId}`;
