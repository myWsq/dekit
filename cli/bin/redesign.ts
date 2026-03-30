#!/usr/bin/env tsx
import { resolve } from "node:path";
import { parseDesignConfig } from "../src/parser.js";
import { startServers } from "../src/server.js";

function printUsage() {
  console.log(`
Usage: redesign -c <design.yaml>

Options:
  -c, --config       Path to design.yaml (required)
  -p, --port         Editor server port (default: 3000)
  --design-port      Design server port (default: 3001)
  -h, --help         Show this help message
`);
}

function parseArgs(args: string[]) {
  const result: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "-c" || arg === "--config") {
      result.config = args[++i];
    } else if (arg === "-p" || arg === "--port") {
      result.port = args[++i];
    } else if (arg === "--design-port") {
      result.designPort = args[++i];
    } else if (arg === "-h" || arg === "--help") {
      result.help = "true";
    }
  }
  return result;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printUsage();
    process.exit(0);
  }

  if (!args.config) {
    console.error("Error: -c <design.yaml> is required\n");
    printUsage();
    process.exit(1);
  }

  const configPath = resolve(args.config);
  let config;
  try {
    config = await parseDesignConfig(configPath);
  } catch (err) {
    console.error(
      `Error parsing config: ${err instanceof Error ? err.message : err}`
    );
    process.exit(1);
  }

  const port = parseInt(args.port ?? "3000", 10);
  const designPort = parseInt(args.designPort ?? "3001", 10);

  await startServers({ config, port, designPort });
}

main();
