import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIR = path.resolve(__dirname, "../src");

const BANNED_IMPORTS = ["useNavigate", "Link", "NavLink", "Navigate", "useHref"];

function getFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir)) {
    const filePath = path.join(dir, entry);
    if (fs.statSync(filePath).isDirectory()) {
      // Exclude only the top-level src/routes and src/testing (a nested
      // features/*/routes dir must still be checked), plus node_modules.
      if (
        filePath === path.join(SRC_DIR, "routes") ||
        filePath === path.join(SRC_DIR, "testing") ||
        entry === "node_modules"
      ) {
        continue;
      }
      files.push(...getFiles(filePath));
    } else if (
      (entry.endsWith(".ts") || entry.endsWith(".tsx")) &&
      !entry.includes(".stories.")
    ) {
      files.push(filePath);
    }
  }
  return files;
}

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const importRegex = /import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+["']react-router-dom["']/g;
  const violations = [];

  for (const match of content.matchAll(importRegex)) {
    const names = match[1]
      .split(",")
      .map((raw) => raw.trim().replace(/^type\s+/, "").split(/\s+as\s+/)[0].trim())
      .filter(Boolean);
    for (const name of names) {
      if (BANNED_IMPORTS.includes(name)) {
        const line = content.slice(0, match.index).split("\n").length;
        violations.push({ line, name });
      }
    }
  }
  return violations;
}

let failed = false;
for (const file of getFiles(SRC_DIR)) {
  for (const violation of checkFile(file)) {
    failed = true;
    console.error(
      `  - ${path.relative(path.resolve(__dirname, ".."), file)}:${violation.line}: Imported banned symbol "${violation.name}" from "react-router-dom"`,
    );
  }
}

if (failed) {
  console.error("\ncheck-navigation-discipline FAILED. Banned react-router-dom APIs found outside src/routes/.");
  process.exit(1);
}
console.log("check-navigation-discipline OK — No raw navigation imports found outside of src/routes.");
