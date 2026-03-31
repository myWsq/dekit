#!/usr/bin/env tsx
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { parseDesignConfig } from "../src/parser.js";
import { startServers } from "../src/server.js";

function printUsage() {
  console.log(`
Usage: dekit [-c <dekit.yaml>]

Options:
  -c, --config       Path to dekit.yaml (default: ./dekit.yaml or ./dekit.yml)
  -p, --port         Editor server port (default: 3000)
  --design-port      Design server port (default: 3001)
  -h, --help         Show this help message
`);
}

function findDefaultConfig(): string | undefined {
  for (const name of ["dekit.yaml", "dekit.yml", "design.yaml", "design.yml"]) {
    const p = resolve(name);
    if (existsSync(p)) return p;
  }
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

  const configPath = args.config
    ? resolve(args.config)
    : findDefaultConfig();

  if (!configPath) {
    console.error(
      "Error: no dekit.yaml found in current directory. Use -c to specify a config file.\n"
    );
    printUsage();
    process.exit(1);
  }
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
