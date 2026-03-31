import type { DesignConfig } from "./types.js";
import { startDesignServer } from "./design-server.js";
import { startEditorServer } from "./editor-server.js";
import { createServer } from "node:net";

const DEFAULT_PORT = 7980;

export interface ServerOptions {
  config: DesignConfig;
  port?: number;
  noOpen?: boolean;
}

async function findAvailablePort(preferred: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.listen(preferred, () => {
      srv.close(() => resolve(preferred));
    });
    srv.on("error", () => {
      // Preferred port taken, use random
      const srv2 = createServer();
      srv2.listen(0, () => {
        const addr = srv2.address();
        const port = typeof addr === "object" && addr ? addr.port : 0;
        srv2.close(() => resolve(port));
      });
      srv2.on("error", reject);
    });
  });
}

export async function startServers(options: ServerOptions) {
  const configRef = { current: options.config };

  console.log("\n  Dekit Dev Server\n");

  const designServer = await startDesignServer(configRef);
  const designAddr = designServer.httpServer!.address();
  const designPort =
    typeof designAddr === "object" && designAddr ? designAddr.port : 0;

  const editorPort = await findAvailablePort(options.port ?? DEFAULT_PORT);
  const editorServer = await startEditorServer(
    configRef,
    editorPort,
    designPort
  );

  const editorUrl = `http://localhost:${editorPort}`;
  console.log(`\n  Open ${editorUrl} in your browser\n`);

  // Try to open browser
  if (!options.noOpen) {
    try {
      const open = await import("open");
      await open.default(editorUrl);
    } catch {
      // Silently ignore if open fails
    }
  }

  return { designServer, editorServer };
}
