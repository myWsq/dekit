import { createServer, type ViteDevServer } from "vite";
import type { DesignConfig } from "./types.js";
import { dekitPlugin } from "./vite-plugin-dekit.js";

export async function startDesignServer(
  configRef: { current: DesignConfig }
): Promise<ViteDevServer> {
  const server = await createServer({
    configFile: false,
    root: configRef.current.baseDir,
    server: {
      port: 0,
      strictPort: false,
      cors: true,
    },
    plugins: [dekitPlugin(configRef)],
    logLevel: "silent",
  });

  await server.listen();
  const address = server.httpServer!.address();
  const port = typeof address === "object" && address ? address.port : 0;
  console.log(`  Design server running at http://localhost:${port}`);
  return server;
}
