import { createServer } from "node:http";
import { join } from "node:path";
import { readFile } from "node:fs/promises";
import type { DesignConfig } from "./types.js";

export async function startEditorServer(
  configRef: { current: DesignConfig },
  port: number,
  designPort: number
): Promise<ReturnType<typeof createServer>> {
  const editorDistDir = join(import.meta.dirname, "../dist/editor");

  const server = createServer(async (req, res) => {
    const url = req.url ?? "/";

    // API: return design config as JSON
    if (url === "/api/config") {
      const config = configRef.current;
      const payload = {
        pages: Object.keys(config.pages),
        components: Object.keys(config.components),
        designServerUrl: `http://localhost:${designPort}`,
      };
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.end(JSON.stringify(payload));
      return;
    }

    // Serve static editor files
    let filePath = join(editorDistDir, url === "/" ? "index.html" : url);
    try {
      const content = await readFile(filePath);
      const ext = filePath.split(".").pop() ?? "";
      const mimeTypes: Record<string, string> = {
        html: "text/html",
        js: "application/javascript",
        css: "text/css",
        svg: "image/svg+xml",
        png: "image/png",
        json: "application/json",
      };
      res.setHeader("Content-Type", mimeTypes[ext] ?? "application/octet-stream");
      res.end(content);
    } catch {
      // SPA fallback
      try {
        const index = await readFile(join(editorDistDir, "index.html"));
        res.setHeader("Content-Type", "text/html");
        res.end(index);
      } catch {
        res.statusCode = 404;
        res.end("Not found");
      }
    }
  });

  return new Promise((resolve) => {
    server.listen(port, () => {
      console.log(`  Editor server running at http://localhost:${port}`);
      resolve(server);
    });
  });
}
