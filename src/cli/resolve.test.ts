import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { runInit } from "./init.js";
import { parseDesignConfig } from "../parser.js";
import { runResolve } from "./resolve.js";

let tempDir: string;

beforeEach(async () => {
  tempDir = mkdtempSync(join(tmpdir(), "dekit-resolve-"));
  await runInit([tempDir, "--template", "landing"]);
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

describe("runResolve", () => {
  test("resolves page ref to file path", async () => {
    const config = await parseDesignConfig(join(tempDir, "dekit.yaml"));
    const spy = vi.spyOn(console, "log");
    await runResolve(config, ["$${home}"]);
    expect(spy.mock.calls[0][0]).toContain("pages/home/home.html");
    spy.mockRestore();
  });

  test("resolves element ref to file path with line range", async () => {
    const config = await parseDesignConfig(join(tempDir, "dekit.yaml"));
    const spy = vi.spyOn(console, "log");
    await runResolve(config, ["$${home@.hero}"]);
    const output = spy.mock.calls[0][0] as string;
    expect(output).toContain("pages/home/home.html");
    expect(output).toMatch(/:\d+(-\d+)?$/);
    spy.mockRestore();
  });

  test("rejects unknown page", async () => {
    const config = await parseDesignConfig(join(tempDir, "dekit.yaml"));
    await expect(runResolve(config, ["$${nonexistent}"])).rejects.toThrow(/not found/i);
  });
});
