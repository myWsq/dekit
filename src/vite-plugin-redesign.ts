import type { Plugin } from "vite";
import type { DesignConfig } from "./types.js";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { generateComponentRegistrationScript } from "./injected/register-components.js";
import { generateInspectorScript } from "./injected/inspector.js";

export async function assemblePageHtml(
  config: DesignConfig,
  pageName: string
): Promise<string> {
  const pageDef = config.pages[pageName];
  if (!pageDef) {
    throw new Error(`Page "${pageName}" not found in design config`);
  }

  const pageTemplate = await readFile(
    join(config.baseDir, pageDef.template),
    "utf-8"
  );
  const componentScript = await generateComponentRegistrationScript(
    config.components,
    config.baseDir
  );
  const inspectorScript = generateInspectorScript();

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="/@design/${config.globalStyle}">
  <link rel="stylesheet" href="/@design/${pageDef.style}">
</head>
<body>
${pageTemplate}
<script type="module">
${componentScript}
</script>
<script>
${inspectorScript}
</script>
</body>
</html>`;
}

export function redesignPlugin(configRef: { current: DesignConfig }): Plugin {
  return {
    name: "vite-plugin-redesign",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ?? "";

        if (url.startsWith("/@design/")) {
          const filePath = join(
            configRef.current.baseDir,
            url.replace("/@design/", "")
          );
          try {
            const content = await readFile(filePath, "utf-8");
            const ext = filePath.split(".").pop();
            const mimeTypes: Record<string, string> = {
              css: "text/css",
              html: "text/html",
              js: "application/javascript",
            };
            res.setHeader(
              "Content-Type",
              mimeTypes[ext ?? ""] ?? "text/plain"
            );
            res.end(content);
          } catch {
            res.statusCode = 404;
            res.end("Not found");
          }
          return;
        }

        const pageMatch = url.match(/^\/page\/([^/?#]+)/);
        if (pageMatch) {
          const pageName = pageMatch[1];
          try {
            const html = await assemblePageHtml(configRef.current, pageName);
            res.setHeader("Content-Type", "text/html");
            res.end(html);
          } catch (err) {
            res.statusCode = 404;
            res.end(
              err instanceof Error ? err.message : "Page not found"
            );
          }
          return;
        }

        next();
      });

      const watcher = server.watcher;
      watcher.add(configRef.current.baseDir);
      watcher.on("change", (changedPath) => {
        if (changedPath.startsWith(configRef.current.baseDir)) {
          server.ws.send({ type: "full-reload" });
        }
      });
    },
  };
}
