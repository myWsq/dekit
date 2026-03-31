import { existsSync, mkdirSync, cpSync } from "node:fs";
import { resolve, join } from "node:path";

const TEMPLATES_DIR = join(import.meta.dirname, "../../templates/projects");

const AVAILABLE_TEMPLATES = ["blank", "landing", "dashboard", "mobile"];

export async function runInit(args: string[]) {
  let targetDir = process.cwd();
  let template = "blank";

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--template") {
      const next = args[i + 1];
      if (!next || next.startsWith("-")) {
        console.log("Available templates: " + AVAILABLE_TEMPLATES.join(", "));
        return;
      }
      template = next;
      i++;
    } else if (!arg.startsWith("-")) {
      targetDir = resolve(arg);
    }
  }

  if (!AVAILABLE_TEMPLATES.includes(template)) {
    throw new Error(
      `Unknown template: "${template}". Available: ${AVAILABLE_TEMPLATES.join(", ")}`
    );
  }

  const dekitDir = join(targetDir, ".dekit");

  if (existsSync(join(dekitDir, "dekit.yaml"))) {
    throw new Error(`dekit.yaml already exists in ${dekitDir}`);
  }

  const templateDir = join(TEMPLATES_DIR, template);
  if (!existsSync(templateDir)) {
    throw new Error(`Template directory not found: ${templateDir}`);
  }

  mkdirSync(dekitDir, { recursive: true });
  cpSync(templateDir, dekitDir, { recursive: true });

  console.log(`Created dekit project in ${dekitDir} (template: ${template})`);
}
