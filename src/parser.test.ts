import { describe, test, expect } from "vitest";
import { parseDesignConfig } from "./parser.js";
import { join } from "node:path";

const DESIGN_DIR = join(import.meta.dirname, "../example/.dekit");

describe("parseDesignConfig", () => {
  test("parses valid dekit.yaml", async () => {
    const config = await parseDesignConfig(join(DESIGN_DIR, "dekit.yaml"));
    expect(config.version).toBe(1.0);
    expect(config.globalStyle).toBe("global.css");
    expect(config.components["ui-card"]).toEqual({
      template: "components/ui-card/ui-card.html",
      style: "components/ui-card/ui-card.css",
    });
    expect(config.pages["home"]).toEqual({
      template: "pages/home/home.html",
      style: "pages/home/home.css",
    });
    expect(config.pages["showcase"]).toBeDefined();
  });

  test("stores resolved base directory", async () => {
    const config = await parseDesignConfig(join(DESIGN_DIR, "dekit.yaml"));
    expect(config.baseDir).toBe(DESIGN_DIR);
  });

  test("rejects component key without hyphen", async () => {
    const yaml = `
version: 1.0
global-style: "global.css"
components:
  banner:
    template: "components/banner/banner.html"
    style: "components/banner/banner.css"
pages: {}
`;
    await expect(
      parseDesignConfig("/fake/dekit.yaml", yaml)
    ).rejects.toThrow(/hyphen/i);
  });

  test("rejects missing template file", async () => {
    const yaml = `
version: 1.0
global-style: "global.css"
components: {}
pages:
  cover:
    template: "pages/nonexistent.html"
    style: "pages/cover/cover.css"
`;
    await expect(
      parseDesignConfig(join(DESIGN_DIR, "dekit.yaml"), yaml)
    ).rejects.toThrow(/not found|does not exist/i);
  });

  test("rejects missing version field", async () => {
    const yaml = `
global-style: "global.css"
components: {}
pages: {}
`;
    await expect(
      parseDesignConfig("/fake/dekit.yaml", yaml)
    ).rejects.toThrow(/version/i);
  });
});
