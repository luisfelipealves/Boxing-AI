import type { Box } from '../types';
import { buildBoxQrValue } from './labelPrintConfig';
import { B1_PRO_50X30_PROFILE, type NiimbotLabelProfile } from './niimbot';
import qrcode from 'qr.js';

type LabelRasterRenderErrorCode = 'profile-mismatch' | 'missing-box-number' | 'render-failed' | 'invalid-bitmap';

export class LabelRasterRenderError extends Error {
  readonly code: LabelRasterRenderErrorCode;

  constructor(code: LabelRasterRenderErrorCode, message: string) {
    super(message);
    this.name = 'LabelRasterRenderError';
    this.code = code;
  }
}

export interface RenderBoxLabelRasterOptions {
  readonly box: Box;
  readonly origin: string;
  readonly pathname: string;
  readonly profile?: NiimbotLabelProfile;
}

export interface RenderedLabelRaster {
  readonly widthPx: number;
  readonly heightPx: number;
  readonly bytesPerRow: number;
  readonly profileId: string;
  readonly qrValue: string;
  readonly boxNumberText: string;
  readonly boxNameText?: string;
  readonly pixels: Uint8Array;
  readonly packedRows: Uint8Array;
  readonly rasterBase64: string;
}

interface MonochromeBitmap {
  readonly widthPx: number;
  readonly heightPx: number;
  readonly pixels: Uint8Array;
}

export interface ThresholdRgbaToMonochromeOptions {
  readonly widthPx: number;
  readonly heightPx: number;
  readonly rgba: Uint8ClampedArray | Uint8Array;
  readonly threshold?: number;
}

export interface PackMonochromeRowsOptions {
  readonly widthPx: number;
  readonly heightPx: number;
  readonly pixels: Uint8Array;
}

interface QrCodeMatrix {
  readonly getModuleCount: () => number;
  readonly isDark: (row: number, col: number) => boolean;
}

const DEFAULT_PROFILE = B1_PRO_50X30_PROFILE;
const THERMAL_THRESHOLD = 192;
const QR_LEFT_PX = 30;
const QR_TOP_PX = 33;
const QR_SIZE_PX = 288;
const QUIET_ZONE_MODULES = 4;
const TEXT_LEFT_PX = 350;
const NUMBER_TOP_PX = 96;
const NAME_TOP_PX = 238;
const MAX_SAFE_BOX_NAME_LENGTH = 28;
const BASE64_CHUNK_SIZE = 0x8000;

const FONT_5X7: Record<string, readonly string[]> = {
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
  '#': ['01010', '11111', '01010', '01010', '11111', '01010', '00000'],
  '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '10000', '11110', '00001', '00001', '11110'],
  '6': ['01110', '10000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00001', '01110'],
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01111', '10000', '10000', '10000', '10000', '10000', '01111'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01111', '10000', '10000', '10011', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  J: ['00111', '00010', '00010', '00010', '00010', '10010', '01100'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '01010', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '11011', '10001'],
  X: ['10001', '01010', '00100', '00100', '00100', '01010', '10001'],
  Y: ['10001', '01010', '00100', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
};

export const thresholdRgbaToMonochrome = ({
  widthPx,
  heightPx,
  rgba,
  threshold = THERMAL_THRESHOLD,
}: ThresholdRgbaToMonochromeOptions): Uint8Array => {
  if (rgba.length !== widthPx * heightPx * 4) {
    throw new LabelRasterRenderError('invalid-bitmap', 'RGBA source length does not match bitmap dimensions.');
  }

  const pixels = new Uint8Array(widthPx * heightPx);
  for (let index = 0; index < pixels.length; index += 1) {
    const offset = index * 4;
    const alpha = rgba[offset + 3] ?? 255;
    if (alpha < 128) {
      pixels[index] = 0;
      continue;
    }

    const red = rgba[offset] ?? 255;
    const green = rgba[offset + 1] ?? 255;
    const blue = rgba[offset + 2] ?? 255;
    const luma = 0.299 * red + 0.587 * green + 0.114 * blue;
    pixels[index] = luma < threshold ? 1 : 0;
  }
  return pixels;
};

export const packMonochromeRows = ({ widthPx, heightPx, pixels }: PackMonochromeRowsOptions): Uint8Array => {
  if (pixels.length !== widthPx * heightPx) {
    throw new LabelRasterRenderError('invalid-bitmap', 'Monochrome pixel length does not match bitmap dimensions.');
  }

  const bytesPerRow = Math.ceil(widthPx / 8);
  const packed = new Uint8Array(bytesPerRow * heightPx);
  for (let y = 0; y < heightPx; y += 1) {
    for (let x = 0; x < widthPx; x += 1) {
      if (pixels[y * widthPx + x] === 0) continue;
      const byteIndex = y * bytesPerRow + Math.floor(x / 8);
      const bitIndex = 7 - (x % 8);
      packed[byteIndex] |= 1 << bitIndex;
    }
  }
  return packed;
};

export const renderBoxLabelRaster = ({
  box,
  origin,
  pathname,
  profile = DEFAULT_PROFILE,
}: RenderBoxLabelRasterOptions): RenderedLabelRaster => {
  assertDefaultB1ProProfile(profile);
  if (!Number.isInteger(box.boxNumber)) {
    throw new LabelRasterRenderError('missing-box-number', 'Cannot render a NIIMBOT label without a stable box number.');
  }

  try {
    const qrValue = buildBoxQrValue(origin, pathname, box.id);
    const bitmap = createBlankBitmap(profile.rasterWidthPx, profile.rasterHeightPx);
    drawBorder(bitmap);
    drawQr(bitmap, qrValue);

    const boxNumberText = `#${box.boxNumber}`;
    drawText(bitmap, boxNumberText, TEXT_LEFT_PX, NUMBER_TOP_PX, 13, 3);

    const boxNameText = getSafeBoxName(box.name);
    if (boxNameText) {
      drawText(bitmap, boxNameText, TEXT_LEFT_PX, NAME_TOP_PX, 4, 2);
    }
    drawText(bitmap, 'BOXTRACK', TEXT_LEFT_PX, 304, 3, 2);

    const packedRows = packMonochromeRows(bitmap);
    return {
      widthPx: bitmap.widthPx,
      heightPx: bitmap.heightPx,
      bytesPerRow: Math.ceil(bitmap.widthPx / 8),
      profileId: profile.id,
      qrValue,
      boxNumberText,
      boxNameText,
      pixels: bitmap.pixels,
      packedRows,
      rasterBase64: encodeBase64(packedRows),
    };
  } catch (error) {
    if (error instanceof LabelRasterRenderError) throw error;
    throw new LabelRasterRenderError('render-failed', error instanceof Error ? error.message : 'Label raster rendering failed.');
  }
};

const encodeBase64 = (bytes: Uint8Array): string => {
  if (typeof btoa === 'function') {
    let binary = '';
    for (let offset = 0; offset < bytes.length; offset += BASE64_CHUNK_SIZE) {
      const chunk = bytes.subarray(offset, offset + BASE64_CHUNK_SIZE);
      binary += String.fromCharCode(...chunk);
    }
    return btoa(binary);
  }

  const nodeBuffer = (globalThis as typeof globalThis & { Buffer?: typeof Buffer }).Buffer;
  if (nodeBuffer) {
    return nodeBuffer.from(bytes).toString('base64');
  }

  throw new LabelRasterRenderError('render-failed', 'No base64 encoder is available for the label raster.');
};

const assertDefaultB1ProProfile = (profile: NiimbotLabelProfile): void => {
  if (
    profile.id !== DEFAULT_PROFILE.id ||
    profile.modelId !== DEFAULT_PROFILE.modelId ||
    profile.protocolTask !== DEFAULT_PROFILE.protocolTask ||
    profile.rasterWidthPx !== DEFAULT_PROFILE.rasterWidthPx ||
    profile.rasterHeightPx !== DEFAULT_PROFILE.rasterHeightPx ||
    profile.dpi !== DEFAULT_PROFILE.dpi
  ) {
    throw new LabelRasterRenderError(
      'profile-mismatch',
      'The JS label renderer currently supports only NIIMBOT B1 Pro 50 × 30 mm at 576 × 354 px.',
    );
  }
};

const createBlankBitmap = (widthPx: number, heightPx: number): MonochromeBitmap => ({
  widthPx,
  heightPx,
  pixels: new Uint8Array(widthPx * heightPx),
});

const drawBorder = (bitmap: MonochromeBitmap): void => {
  drawRect(bitmap, 0, 0, bitmap.widthPx, 3);
  drawRect(bitmap, 0, bitmap.heightPx - 3, bitmap.widthPx, 3);
  drawRect(bitmap, 0, 0, 3, bitmap.heightPx);
  drawRect(bitmap, bitmap.widthPx - 3, 0, 3, bitmap.heightPx);
};

const drawQr = (bitmap: MonochromeBitmap, value: string): void => {
  const qr = qrcode(value, { errorCorrectLevel: qrcode.ErrorCorrectLevel.H }) as QrCodeMatrix;
  const moduleCount = qr.getModuleCount();
  const totalModules = moduleCount + QUIET_ZONE_MODULES * 2;
  const moduleSizePx = Math.floor(QR_SIZE_PX / totalModules);
  const actualSizePx = totalModules * moduleSizePx;
  const qrOriginX = QR_LEFT_PX + Math.floor((QR_SIZE_PX - actualSizePx) / 2);
  const qrOriginY = QR_TOP_PX + Math.floor((QR_SIZE_PX - actualSizePx) / 2);

  drawRect(bitmap, QR_LEFT_PX - 6, QR_TOP_PX - 6, QR_SIZE_PX + 12, QR_SIZE_PX + 12, 0);
  for (let row = 0; row < moduleCount; row += 1) {
    for (let col = 0; col < moduleCount; col += 1) {
      if (!qr.isDark(row, col)) continue;
      drawRect(
        bitmap,
        qrOriginX + (col + QUIET_ZONE_MODULES) * moduleSizePx,
        qrOriginY + (row + QUIET_ZONE_MODULES) * moduleSizePx,
        moduleSizePx,
        moduleSizePx,
      );
    }
  }
};

const getSafeBoxName = (name: string): string | undefined => {
  const normalized = name.trim().replace(/\s+/g, ' ');
  if (!normalized || normalized.length > MAX_SAFE_BOX_NAME_LENGTH) return undefined;
  return normalized.replace(/[^ a-zA-Z0-9-]/g, '-');
};

const drawText = (
  bitmap: MonochromeBitmap,
  text: string,
  x: number,
  y: number,
  scale: number,
  letterSpacing: number,
): void => {
  let cursorX = x;
  for (const rawCharacter of text.toUpperCase()) {
    const character = FONT_5X7[rawCharacter] ? rawCharacter : '-';
    const glyph = FONT_5X7[character];
    if (!glyph) continue;
    drawGlyph(bitmap, glyph, cursorX, y, scale);
    cursorX += (5 + letterSpacing) * scale;
  }
};

const drawGlyph = (bitmap: MonochromeBitmap, glyph: readonly string[], x: number, y: number, scale: number): void => {
  glyph.forEach((row, rowIndex) => {
    [...row].forEach((cell, colIndex) => {
      if (cell !== '1') return;
      drawRect(bitmap, x + colIndex * scale, y + rowIndex * scale, scale, scale);
    });
  });
};

const drawRect = (
  bitmap: MonochromeBitmap,
  x: number,
  y: number,
  width: number,
  height: number,
  value: 0 | 1 = 1,
): void => {
  const startX = Math.max(0, Math.floor(x));
  const startY = Math.max(0, Math.floor(y));
  const endX = Math.min(bitmap.widthPx, Math.ceil(x + width));
  const endY = Math.min(bitmap.heightPx, Math.ceil(y + height));

  for (let row = startY; row < endY; row += 1) {
    for (let col = startX; col < endX; col += 1) {
      bitmap.pixels[row * bitmap.widthPx + col] = value;
    }
  }
};
