import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { runInit } from "./init.js";

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), "dekit-init-"));
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

describe("runInit", () => {
  test("creates blank project in .dekit/ under target directory", async () => {
    await runInit([tempDir]);

    const dekitDir = join(tempDir, ".dekit");
    expect(existsSync(join(dekitDir, "dekit.yaml"))).toBe(true);
    expect(existsSync(join(dekitDir, "global.css"))).toBe(true);
    expect(existsSync(join(dekitDir, "pages/home/home.html"))).toBe(true);
    expect(existsSync(join(dekitDir, "pages/home/home.css"))).toBe(true);
  });

  test("creates project in .dekit/ under current directory when no path given", async () => {
    const origCwd = process.cwd();
    process.chdir(tempDir);
    try {
      await runInit([]);
      expect(existsSync(join(tempDir, ".dekit/dekit.yaml"))).toBe(true);
    } finally {
      process.chdir(origCwd);
    }
  });

  test("creates landing template when specified", async () => {
    await runInit([tempDir, "--template", "landing"]);

    const html = readFileSync(join(tempDir, ".dekit/pages/home/home.html"), "utf-8");
    expect(html).toContain("hero");
  });

  test("refuses to init when .dekit/dekit.yaml already exists", async () => {
    await runInit([tempDir]);
    await expect(runInit([tempDir])).rejects.toThrow(/already exists/i);
  });

  test("mobile template includes device by default", async () => {
    await runInit([tempDir, "--template", "mobile"]);

    const content = readFileSync(join(tempDir, ".dekit/dekit.yaml"), "utf-8");
    expect(content).toContain("iPhone 16");
  });

  test("--device flag writes device to dekit.yaml", async () => {
    await runInit([tempDir, "--device", "iPad Air"]);

    const content = readFileSync(join(tempDir, ".dekit/dekit.yaml"), "utf-8");
    expect(content).toContain("iPad Air");
  });

  test("--device flag overrides template default device", async () => {
    await runInit([tempDir, "--template", "mobile", "--device", "Pixel 8"]);

    const content = readFileSync(join(tempDir, ".dekit/dekit.yaml"), "utf-8");
    expect(content).toContain("Pixel 8");
    expect(content).not.toContain("iPhone 16");
  });

  test("lists templates when --template given without value", async () => {
    const consoleSpy = vi.spyOn(console, "log");
    await runInit(["--template"]);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("blank")
    );
    consoleSpy.mockRestore();
  });
});
