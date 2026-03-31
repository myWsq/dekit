import { existsSync } from "node:fs";
import { platform } from "node:os";

const CHROME_PATHS: Record<string, string[]> = {
  darwin: [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
  ],
  linux: [
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
  ],
  win32: [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  ],
};

export async function findChrome(): Promise<string> {
  const envPath = process.env.CHROME_PATH;
  if (envPath && existsSync(envPath)) {
    return envPath;
  }

  const candidates = CHROME_PATHS[platform()] ?? [];
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    "Chrome not found. Install Chrome or set CHROME_PATH environment variable."
  );
}
