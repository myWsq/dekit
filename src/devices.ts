export interface DevicePreset {
  name: string;
  width: number;
  height: number;
  dpr: number;
}

export const DEVICE_PRESETS: DevicePreset[] = [
  { name: "iPhone SE", width: 375, height: 667, dpr: 2 },
  { name: "iPhone 14", width: 390, height: 844, dpr: 3 },
  { name: "iPhone 14 Pro", width: 393, height: 852, dpr: 3 },
  { name: "iPhone 14 Pro Max", width: 430, height: 932, dpr: 3 },
  { name: "iPhone 16", width: 393, height: 852, dpr: 3 },
  { name: "iPhone 16 Pro Max", width: 440, height: 956, dpr: 3 },
  { name: "iPad Mini", width: 744, height: 1133, dpr: 2 },
  { name: "iPad Air", width: 820, height: 1180, dpr: 2 },
  { name: 'iPad Pro 12.9"', width: 1024, height: 1366, dpr: 2 },
  { name: "Samsung Galaxy S24", width: 360, height: 780, dpr: 3 },
  { name: "Pixel 8", width: 412, height: 915, dpr: 2.625 },
  { name: "Desktop 1280", width: 1280, height: 800, dpr: 1 },
  { name: "Desktop 1440", width: 1440, height: 900, dpr: 1 },
  { name: "Desktop 1920", width: 1920, height: 1080, dpr: 1 },
];
