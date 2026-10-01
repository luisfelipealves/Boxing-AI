declare module 'qr.js' {
  export interface QrCodeMatrix {
    getModuleCount(): number;
    isDark(row: number, col: number): boolean;
  }

  export interface QrErrorCorrectLevel {
    readonly L: number;
    readonly M: number;
    readonly Q: number;
    readonly H: number;
  }

  export interface QrFactoryOptions {
    readonly typeNumber?: number;
    readonly errorCorrectLevel?: number;
  }

  interface QrFactory {
    (data: string, options?: QrFactoryOptions): QrCodeMatrix;
    readonly ErrorCorrectLevel: QrErrorCorrectLevel;
  }

  const qrcode: QrFactory;
  export default qrcode;
}
