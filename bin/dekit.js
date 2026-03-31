#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// Resolve tsx from this package's own node_modules, not from CWD
const tsxPath = pathToFileURL(require.resolve("tsx")).href;

try {
  execFileSync(process.execPath, [
    "--import", tsxPath,
    join(__dirname, "dekit.ts"),
    ...process.argv.slice(2),
  ], { stdio: "inherit" });
} catch (e) {
  process.exit(e.status ?? 1);
}
