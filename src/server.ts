import type { DesignConfig } from "./types.js";
import { startDesignServer } from "./design-server.js";
import { startEditorServer } from "./editor-server.js";

export interface ServerOptions {
  config: DesignConfig;
  port: number;
  designPort: number;
  noOpen?: boolean;
}

export async function startServers(options: ServerOptions) {
  const configRef = { current: options.config };

  console.log("\n  Dekit Dev Server\n");

  const designServer = await startDesignServer(configRef, options.designPort);
  const editorServer = await startEditorServer(
    configRef,
    options.port,
    options.designPort
  );

  const editorUrl = `http://localhost:${options.port}`;
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
