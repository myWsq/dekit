import type { Plugin } from "vite";
import type { DesignConfig } from "./types.js";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { generateComponentRegistrationScript } from "./injected/register-components.js";
import { generateInspectorScript } from "./injected/inspector.js";

export function resolvePageProps(
  pageDef: { properties?: Record<string, { type: string; default: unknown }> },
  overrides?: Record<string, string>
): Record<string, unknown> {
  const props: Record<string, unknown> = {};
  if (!pageDef.properties) return props;

  for (const [key, def] of Object.entries(pageDef.properties)) {
    props[key] = def.default;
  }

  if (overrides) {
    for (const [key, raw] of Object.entries(overrides)) {
      const def = pageDef.properties[key];
      if (!def) continue;
      if (def.type === "boolean") {
        props[key] = raw === "true";
      } else if (def.type === "number") {
        props[key] = Number(raw);
      } else {
        props[key] = raw;
      }
    }
  }

  return props;
}

export async function assemblePageHtml(
  config: DesignConfig,
  pageName: string,
  options?: { inspector?: boolean; props?: Record<string, string> }
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

  const includeInspector = options?.inspector !== false;
  const inspectorBlock = includeInspector
    ? `<script>\n${generateInspectorScript()}\n</script>`
    : "";

  const resolvedProps = resolvePageProps(pageDef, options?.props);
  const propsBlock = Object.keys(resolvedProps).length > 0
    ? `<script>window.__DEKIT_PROPS__ = ${JSON.stringify(resolvedProps)};</script>\n`
    : "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script type="module" src="/@vite/client"></script>
  <link rel="stylesheet" href="/@design/${config.globalStyle}">
  <link rel="stylesheet" href="/@design/${pageDef.style}">
</head>
<body>
${propsBlock}${pageTemplate}
<script type="module">
${componentScript}
</script>
${inspectorBlock}
</body>
</html>`;
}

export function dekitPlugin(configRef: { current: DesignConfig }): Plugin {
  return {
    name: "vite-plugin-dekit",
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
          const urlObj = new URL(url, "http://localhost");
          const noInspector = urlObj.searchParams.has("noinspector");
          const props: Record<string, string> = {};
          for (const [key, value] of urlObj.searchParams.entries()) {
            if (key.startsWith("props.")) {
              props[key.slice(6)] = value;
            }
          }
          try {
            const html = await assemblePageHtml(configRef.current, pageName, {
              inspector: !noInspector,
              props: Object.keys(props).length > 0 ? props : undefined,
            });
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
