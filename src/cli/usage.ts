import { readFileSync } from "node:fs";
import { join } from "node:path";

export async function runUsage() {
  const guidePath = join(import.meta.dirname, "../../docs/usage.md");
  const content = readFileSync(guidePath, "utf-8");
  console.log(content);
}
