import { describe, test, expect, vi, afterEach } from "vitest";
import { findChrome } from "./chrome.js";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("findChrome", () => {
  test("returns CHROME_PATH if set and exists", async () => {
    vi.stubEnv("CHROME_PATH", process.execPath);
    const result = await findChrome();
    expect(result).toBe(process.execPath);
  });

  test("returns a string on systems with Chrome installed", async () => {
    vi.stubEnv("CHROME_PATH", "");
    try {
      const result = await findChrome();
      expect(typeof result).toBe("string");
    } catch (err) {
      expect((err as Error).message).toContain("Chrome not found");
    }
  });
});
