import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, readFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { runInit } from "./init.js";
import { runAdd } from "./add.js";
import { parseDesignConfig } from "../parser.js";

let tempDir: string;

beforeEach(async () => {
  tempDir = mkdtempSync(join(tmpdir(), "dekit-add-"));
  await runInit([tempDir]);
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

describe("runAdd page", () => {
  test("adds a new page with blank template", async () => {
    const config = await parseDesignConfig(join(tempDir, "dekit.yaml"));
    await runAdd(config, ["page", "about"]);

    expect(existsSync(join(tempDir, "pages/about/about.html"))).toBe(true);
    expect(existsSync(join(tempDir, "pages/about/about.css"))).toBe(true);

    const updatedYaml = readFileSync(join(tempDir, "dekit.yaml"), "utf-8");
    expect(updatedYaml).toContain("about");
  });

  test("adds a page with hero template", async () => {
    const config = await parseDesignConfig(join(tempDir, "dekit.yaml"));
    await runAdd(config, ["page", "landing", "--template", "hero"]);

    const html = readFileSync(join(tempDir, "pages/landing/landing.html"), "utf-8");
    expect(html).toContain("hero");
  });

  test("rejects duplicate page name", async () => {
    const config = await parseDesignConfig(join(tempDir, "dekit.yaml"));
    await expect(runAdd(config, ["page", "home"])).rejects.toThrow(/already exists/i);
  });
});

describe("runAdd component", () => {
  test("adds a new component", async () => {
    const config = await parseDesignConfig(join(tempDir, "dekit.yaml"));
    await runAdd(config, ["component", "my-card"]);

    expect(existsSync(join(tempDir, "components/my-card/my-card.html"))).toBe(true);
    expect(existsSync(join(tempDir, "components/my-card/my-card.css"))).toBe(true);

    const updatedYaml = readFileSync(join(tempDir, "dekit.yaml"), "utf-8");
    expect(updatedYaml).toContain("my-card");
  });

  test("rejects component name without hyphen", async () => {
    const config = await parseDesignConfig(join(tempDir, "dekit.yaml"));
    await expect(runAdd(config, ["component", "card"])).rejects.toThrow(/hyphen/i);
  });
});
