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

  test("parses device as preset name string", async () => {
    const yaml = `
version: 1.0
device: "iPhone 16"
pages: {}
`;
    const config = await parseDesignConfig("/fake/dekit.yaml", yaml);
    expect(config.device).toEqual({
      width: 393,
      height: 852,
      dpr: 3,
      name: "iPhone 16",
    });
  });

  test("parses device as custom dimensions object", async () => {
    const yaml = `
version: 1.0
device:
  width: 400
  height: 800
  dpr: 2
pages: {}
`;
    const config = await parseDesignConfig("/fake/dekit.yaml", yaml);
    expect(config.device).toEqual({
      width: 400,
      height: 800,
      dpr: 2,
    });
  });

  test("device defaults dpr to 1 when omitted", async () => {
    const yaml = `
version: 1.0
device:
  width: 400
  height: 800
pages: {}
`;
    const config = await parseDesignConfig("/fake/dekit.yaml", yaml);
    expect(config.device!.dpr).toBe(1);
  });

  test("device is undefined when not specified", async () => {
    const yaml = `
version: 1.0
pages: {}
`;
    const config = await parseDesignConfig("/fake/dekit.yaml", yaml);
    expect(config.device).toBeUndefined();
  });

  test("rejects unknown device preset name", async () => {
    const yaml = `
version: 1.0
device: "Nokia 3310"
pages: {}
`;
    await expect(
      parseDesignConfig("/fake/dekit.yaml", yaml)
    ).rejects.toThrow(/Unknown device/i);
  });

  test("rejects device object without width/height", async () => {
    const yaml = `
version: 1.0
device:
  dpr: 2
pages: {}
`;
    await expect(
      parseDesignConfig("/fake/dekit.yaml", yaml)
    ).rejects.toThrow(/width.*height/i);
  });

  test("parses page properties", async () => {
    const yaml = `
version: 1.0
pages:
  home:
    template: "pages/home/home.html"
    style: "pages/home/home.css"
    properties:
      showBanner:
        type: boolean
        default: true
      itemCount:
        type: number
        default: 3
      title:
        type: string
        default: "Hello"
`;
    const config = await parseDesignConfig("/fake/dekit.yaml", yaml);
    expect(config.pages["home"].properties).toEqual({
      showBanner: { type: "boolean", default: true },
      itemCount: { type: "number", default: 3 },
      title: { type: "string", default: "Hello" },
    });
  });

  test("page without properties has undefined properties", async () => {
    const yaml = `
version: 1.0
pages:
  home:
    template: "pages/home/home.html"
    style: "pages/home/home.css"
`;
    const config = await parseDesignConfig("/fake/dekit.yaml", yaml);
    expect(config.pages["home"].properties).toBeUndefined();
  });

  test("rejects invalid property type", async () => {
    const yaml = `
version: 1.0
pages:
  home:
    template: "pages/home/home.html"
    style: "pages/home/home.css"
    properties:
      color:
        type: color
        default: red
`;
    await expect(
      parseDesignConfig("/fake/dekit.yaml", yaml)
    ).rejects.toThrow(/Invalid type.*color/i);
  });

  test("rejects property with mismatched default type", async () => {
    const yaml = `
version: 1.0
pages:
  home:
    template: "pages/home/home.html"
    style: "pages/home/home.css"
    properties:
      count:
        type: number
        default: "not a number"
`;
    await expect(
      parseDesignConfig("/fake/dekit.yaml", yaml)
    ).rejects.toThrow(/must be a number/i);
  });

  test("rejects property missing default", async () => {
    const yaml = `
version: 1.0
pages:
  home:
    template: "pages/home/home.html"
    style: "pages/home/home.css"
    properties:
      flag:
        type: boolean
`;
    await expect(
      parseDesignConfig("/fake/dekit.yaml", yaml)
    ).rejects.toThrow(/Missing default/i);
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
