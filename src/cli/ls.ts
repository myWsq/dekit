import type { DesignConfig } from "../types.js";

export async function runLs(config: DesignConfig) {
  const pages = Object.keys(config.pages);
  const components = Object.keys(config.components);

  console.log("Pages:");
  if (pages.length === 0) {
    console.log("  (none)");
  } else {
    for (const name of pages) {
      console.log(`  ${name}`);
    }
  }

  console.log("\nComponents:");
  if (components.length === 0) {
    console.log("  (none)");
  } else {
    for (const name of components) {
      console.log(`  ${name}`);
    }
  }
}
