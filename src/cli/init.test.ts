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
  test("creates blank project in target directory", async () => {
    const target = join(tempDir, "my-design");
    await runInit([target]);

    expect(existsSync(join(target, "dekit.yaml"))).toBe(true);
    expect(existsSync(join(target, "global.css"))).toBe(true);
    expect(existsSync(join(target, "pages/home/home.html"))).toBe(true);
    expect(existsSync(join(target, "pages/home/home.css"))).toBe(true);
  });

  test("creates blank project in current directory when no path given", async () => {
    const origCwd = process.cwd();
    process.chdir(tempDir);
    try {
      await runInit([]);
      expect(existsSync(join(tempDir, "dekit.yaml"))).toBe(true);
    } finally {
      process.chdir(origCwd);
    }
  });

  test("creates landing template when specified", async () => {
    const target = join(tempDir, "landing");
    await runInit([target, "--template", "landing"]);

    const html = readFileSync(join(target, "pages/home/home.html"), "utf-8");
    expect(html).toContain("hero");
  });

  test("refuses to init in directory with existing dekit.yaml", async () => {
    const target = join(tempDir, "existing");
    await runInit([target]);
    await expect(runInit([target])).rejects.toThrow(/already exists/i);
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
