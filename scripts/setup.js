#!/usr/bin/env node

import { createInterface } from "readline";
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt, defaultValue) {
  return new Promise((resolve) => {
    const displayPrompt = defaultValue
      ? `${prompt} (${defaultValue}): `
      : `${prompt}: `;
    rl.question(displayPrompt, (answer) => {
      resolve(answer.trim() || defaultValue);
    });
  });
}

async function main() {
  const name = await question("Extension name", "My Extension");
  const description = await question(
    "Description",
    "A Chrome extension built with React and TypeScript"
  );
  const version = await question("Version", "0.1.0");

  const packageName = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const packageJsonPath = resolve(rootDir, "package.json");
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
  packageJson.name = packageName;
  packageJson.version = version;
  writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + "\n");

  const manifestPath = resolve(rootDir, "manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
  manifest.name = name;
  manifest.description = description;
  manifest.version = version;
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");

  const popupAppPath = resolve(rootDir, "src/App.tsx");
  let popupApp = readFileSync(popupAppPath, "utf-8");
  popupApp = popupApp.replace(/My Extension/g, name);
  writeFileSync(popupAppPath, popupApp);

  const indexPath = resolve(rootDir, "index.html");
  let indexHtml = readFileSync(indexPath, "utf-8");
  indexHtml = indexHtml.replace(
    /<title>.*<\/title>/,
    `<title>${name}</title>`
  );
  writeFileSync(indexPath, indexHtml);

  rl.close();
}

main().catch(() => {
  rl.close();
  process.exit(1);
});
