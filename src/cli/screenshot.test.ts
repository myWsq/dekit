import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { runInit } from "./init.js";
import { parseDesignConfig } from "../parser.js";
import { runScreenshot } from "./screenshot.js";
import { findChrome } from "../chrome.js";

let tempDir: string;
let hasChrome = false;

beforeEach(async () => {
  tempDir = mkdtempSync(join(tmpdir(), "dekit-screenshot-"));
  await runInit([tempDir, "--template", "landing"]);
  try {
    await findChrome();
    hasChrome = true;
  } catch {
    hasChrome = false;
  }
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

describe("runScreenshot", () => {
  test.skipIf(!hasChrome)("takes a page screenshot", async () => {
    const config = await parseDesignConfig(join(tempDir, "dekit.yaml"));
    await runScreenshot(config, ["$${home}"]);
    expect(existsSync(join(config.baseDir, "screenshots/home.png"))).toBe(true);
  }, 30000);

  test.skipIf(!hasChrome)("takes element screenshot", async () => {
    const config = await parseDesignConfig(join(tempDir, "dekit.yaml"));
    await runScreenshot(config, ["$${home@.hero}"]);
    // Output filename sanitizes the selector
    const screenshots = join(config.baseDir, "screenshots");
    expect(existsSync(screenshots)).toBe(true);
  }, 30000);

  test.skipIf(!hasChrome)("respects -o flag", async () => {
    const config = await parseDesignConfig(join(tempDir, "dekit.yaml"));
    const outPath = join(tempDir, "my-shot.png");
    await runScreenshot(config, ["$${home}", "-o", outPath]);
    expect(existsSync(outPath)).toBe(true);
  }, 30000);

  test("rejects invalid ref format", async () => {
    const config = await parseDesignConfig(join(tempDir, "dekit.yaml"));
    await expect(runScreenshot(config, ["invalid"])).rejects.toThrow();
  });
});
