import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { parseDesignConfig } from "../src/parser.js";
import { startServers } from "../src/server.js";

function printUsage() {
  console.log(`
Usage: dekit <command> [options]

Commands:
  init [path]          Initialize a new design project
  add <type> <name>    Add a page or component
  ls                   List pages and components
  serve                Start the preview server (default)
  screenshot <ref>     Take a screenshot of a page or element
  resolve <ref>        Resolve a ref to file path and line range
  usage                Print the agent usage guide

Options:
  -c, --config         Path to dekit.yaml
  -h, --help           Show this help message

Run 'dekit <command> --help' for command-specific help.
`);
}

function findDefaultConfig(): string | undefined {
  for (const name of ["dekit.yaml", "dekit.yml", "design.yaml", "design.yml"]) {
    const p = resolve(name);
    if (existsSync(p)) return p;
  }
}

function extractGlobalArgs(args: string[]): {
  config?: string;
  help: boolean;
  rest: string[];
} {
  const rest: string[] = [];
  let config: string | undefined;
  let help = false;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "-c" || arg === "--config") {
      config = args[++i];
    } else if (arg === "-h" || arg === "--help") {
      help = true;
    } else {
      rest.push(arg);
    }
  }
  return { config, help, rest };
}

async function loadConfig(configArg?: string) {
  const configPath = configArg ? resolve(configArg) : findDefaultConfig();
  if (!configPath) {
    console.error(
      "Error: no dekit.yaml found in current directory. Use -c to specify a config file.\n"
    );
    process.exit(1);
  }
  try {
    return await parseDesignConfig(configPath);
  } catch (err) {
    console.error(
      `Error parsing config: ${err instanceof Error ? err.message : err}`
    );
    process.exit(1);
  }
}

async function main() {
  const { config: configArg, help, rest } = extractGlobalArgs(
    process.argv.slice(2)
  );
  const command = rest[0] ?? "serve";
  const commandArgs = rest.slice(1);

  if (help && !rest.length) {
    printUsage();
    process.exit(0);
  }

  switch (command) {
    case "init": {
      const { runInit } = await import("../src/cli/init.js");
      await runInit(commandArgs);
      break;
    }
    case "add": {
      const config = await loadConfig(configArg);
      const { runAdd } = await import("../src/cli/add.js");
      await runAdd(config, commandArgs);
      break;
    }
    case "ls": {
      const config = await loadConfig(configArg);
      const { runLs } = await import("../src/cli/ls.js");
      await runLs(config);
      break;
    }
    case "serve": {
      const config = await loadConfig(configArg);
      const port = parseInt(
        commandArgs.find((_, i, a) => a[i - 1] === "-p") ?? "3000",
        10
      );
      const designPort = parseInt(
        commandArgs.find((_, i, a) => a[i - 1] === "--design-port") ?? "3001",
        10
      );
      const noOpen = commandArgs.includes("--no-open");
      await startServers({ config, port, designPort, noOpen });
      break;
    }
    case "screenshot": {
      const config = await loadConfig(configArg);
      const { runScreenshot } = await import("../src/cli/screenshot.js");
      await runScreenshot(config, commandArgs);
      break;
    }
    case "resolve": {
      const config = await loadConfig(configArg);
      const { runResolve } = await import("../src/cli/resolve.js");
      await runResolve(config, commandArgs);
      break;
    }
    case "usage": {
      const { runUsage } = await import("../src/cli/usage.js");
      await runUsage();
      break;
    }
    default:
      console.error(`Unknown command: ${command}\n`);
      printUsage();
      process.exit(1);
  }
}

main();
