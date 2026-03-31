import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { runInit } from "./init.js";
import { runLs } from "./ls.js";
import { parseDesignConfig } from "../parser.js";

let tempDir: string;

beforeEach(async () => {
  tempDir = mkdtempSync(join(tmpdir(), "dekit-ls-"));
  await runInit([tempDir, "--template", "landing"]);
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

describe("runLs", () => {
  test("lists pages", async () => {
    const config = await parseDesignConfig(join(tempDir, "dekit.yaml"));
    const spy = vi.spyOn(console, "log");
    await runLs(config);
    const output = spy.mock.calls.map((c) => c[0]).join("\n");
    expect(output).toContain("home");
    spy.mockRestore();
  });
});
