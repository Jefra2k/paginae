#!/usr/bin/env node
// Writes src-tauri/capabilities/e2e.json (git-ignored) so that a build with `--features e2e`
// lets the WebDriver plugin talk to the main window. Never commit the generated file.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "src-tauri", "capabilities");
mkdirSync(dir, { recursive: true });
const capability = {
  $schema: "../gen/schemas/desktop-schema.json",
  identifier: "e2e",
  description: "End-to-end test access for the WebDriver plugin (generated, not committed)",
  windows: ["main"],
  permissions: ["wdio-webdriver:default"],
};
const file = join(dir, "e2e.json");
writeFileSync(file, JSON.stringify(capability, null, 2) + "\n");
console.log(`wrote ${file}`);
