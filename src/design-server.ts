import { createServer, type ViteDevServer } from "vite";
import type { DesignConfig } from "./types.js";
import { dekitPlugin } from "./vite-plugin-dekit.js";

export async function startDesignServer(
  configRef: { current: DesignConfig },
  port: number
): Promise<ViteDevServer> {
  const server = await createServer({
    configFile: false,
    root: configRef.current.baseDir,
    server: {
      port,
      strictPort: true,
      cors: true,
    },
    plugins: [dekitPlugin(configRef)],
    logLevel: "silent",
  });

  await server.listen();
  console.log(`  Design server running at http://localhost:${port}`);
  return server;
}
