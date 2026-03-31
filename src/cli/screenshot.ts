import type { DesignConfig } from "../types.js";
import { parseRef } from "../ref.js";
import { findChrome } from "../chrome.js";
import { dekitPlugin } from "../vite-plugin-dekit.js";
import { DEVICE_PRESETS } from "../devices.js";
import { mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import puppeteer from "puppeteer-core";
import { createServer } from "vite";

function sanitizeSelector(selector: string): string {
  return selector.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function parseArgs(args: string[]): {
  ref: string;
  outputPath?: string;
  deviceName?: string;
  width?: number;
  height?: number;
  fullPage: boolean;
} {
  let ref: string | undefined;
  let outputPath: string | undefined;
  let deviceName: string | undefined;
  let width: number | undefined;
  let height: number | undefined;
  let fullPage = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "-o" || arg === "--output") {
      outputPath = args[++i];
    } else if (arg === "--device") {
      deviceName = args[++i];
    } else if (arg === "--width") {
      width = parseInt(args[++i], 10);
    } else if (arg === "--height") {
      height = parseInt(args[++i], 10);
    } else if (arg === "--full-page") {
      fullPage = true;
    } else if (!arg.startsWith("-")) {
      ref = arg;
    }
  }

  if (!ref) {
    throw new Error("Missing ref argument. Expected format: $${page} or $${page@selector}");
  }

  return { ref, outputPath, deviceName, width, height, fullPage };
}

export async function runScreenshot(config: DesignConfig, args: string[]) {
  const { ref, outputPath, deviceName, width, height, fullPage } = parseArgs(args);

  // Parse and validate the ref (throws on invalid format)
  const parsedRef = parseRef(ref);

  // Resolve viewport from --device or --width/--height flags
  let viewportWidth = 1280;
  let viewportHeight = 800;
  let devicePixelRatio = 1;

  if (deviceName) {
    const normalizedInput = deviceName.toLowerCase().replace(/\s+/g, "-");
    const preset = DEVICE_PRESETS.find(
      (d) => d.name.toLowerCase().replace(/\s+/g, "-") === normalizedInput
    );
    if (!preset) {
      throw new Error(
        `Unknown device: "${deviceName}". Available: ${DEVICE_PRESETS.map((d) => d.name).join(", ")}`
      );
    }
    viewportWidth = preset.width;
    viewportHeight = preset.height;
    devicePixelRatio = preset.dpr;
  }

  if (width !== undefined) viewportWidth = width;
  if (height !== undefined) viewportHeight = height;

  // Determine output path
  const screenshotsDir = join(config.workDir, "screenshots");
  let resolvedOutputPath: string;

  if (outputPath) {
    resolvedOutputPath = outputPath;
  } else if (parsedRef.type === "page") {
    resolvedOutputPath = join(screenshotsDir, `${parsedRef.pageKey}.png`);
  } else {
    const safeName = `${parsedRef.pageKey}_${sanitizeSelector(parsedRef.selector)}`;
    resolvedOutputPath = join(screenshotsDir, `${safeName}.png`);
  }

  // Ensure output directory exists
  mkdirSync(dirname(resolvedOutputPath), { recursive: true });

  // Find Chrome
  const executablePath = await findChrome();

  // Start a temporary Vite dev server
  const configRef = { current: config };
  const server = await createServer({
    plugins: [dekitPlugin(configRef)],
    server: { port: 0, strictPort: false },
    logLevel: "silent",
  });
  await server.listen();

  const address = server.httpServer!.address();
  if (!address || typeof address === "string") {
    await server.close();
    throw new Error("Failed to determine Vite server port");
  }
  const port = address.port;

  // Launch headless Chrome
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({
      width: viewportWidth,
      height: viewportHeight,
      deviceScaleFactor: devicePixelRatio,
    });

    const pageKey = parsedRef.pageKey;
    const url = `http://localhost:${port}/page/${pageKey}?noinspector`;
    await page.goto(url, { waitUntil: "networkidle0" });

    if (parsedRef.type === "element") {
      const element = await page.$(parsedRef.selector);
      if (!element) {
        throw new Error(
          `Element not found: "${parsedRef.selector}" on page "${pageKey}"`
        );
      }
      await element.screenshot({ path: resolvedOutputPath });
    } else {
      await page.screenshot({ path: resolvedOutputPath, fullPage });
    }

    console.log(resolvedOutputPath);
  } finally {
    await browser.close();
    await server.close();
  }
}
