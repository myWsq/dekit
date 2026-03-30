import { describe, test, expect } from "vitest";
import { parseDesignConfig } from "./parser.js";
import { join } from "node:path";

const DESIGN_DIR = join(import.meta.dirname, "../example");

describe("parseDesignConfig", () => {
  test("parses valid design.yaml", async () => {
    const config = await parseDesignConfig(join(DESIGN_DIR, "design.yaml"));
    expect(config.version).toBe(1.0);
    expect(config.globalStyle).toBe("global.css");
    expect(config.components["my-banner"]).toEqual({
      template: "components/my-banner/banner.html",
      style: "components/my-banner/banner.css",
    });
    expect(config.pages["cover"]).toEqual({
      template: "pages/cover/cover.html",
      style: "pages/cover/cover.css",
    });
    expect(config.pages["example"]).toBeDefined();
  });

  test("stores resolved base directory", async () => {
    const config = await parseDesignConfig(join(DESIGN_DIR, "design.yaml"));
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
      parseDesignConfig("/fake/design.yaml", yaml)
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
      parseDesignConfig(join(DESIGN_DIR, "design.yaml"), yaml)
    ).rejects.toThrow(/not found|does not exist/i);
  });

  test("rejects missing version field", async () => {
    const yaml = `
global-style: "global.css"
components: {}
pages: {}
`;
    await expect(
      parseDesignConfig("/fake/design.yaml", yaml)
    ).rejects.toThrow(/version/i);
  });
});
