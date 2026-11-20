#!/usr/bin/env node
// Fails if a production npm dependency carries a licence outside the allow-list.
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ALLOWED = new Set([
  "MIT", "ISC", "Apache-2.0", "BSD-2-Clause", "BSD-3-Clause", "0BSD", "CC0-1.0",
  "MPL-2.0", "Unlicense", "CC-BY-4.0", "Python-2.0", "BlueOak-1.0.0",
]);

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const bin = join(root, "node_modules", "license-checker-rseidelsohn", "bin", "license-checker-rseidelsohn.js");

let json;
try {
  json = execFileSync(process.execPath, [bin, "--production", "--json", "--excludePrivatePackages"],
    { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
} catch (e) {
  console.error(`license check: could not run license-checker-rseidelsohn: ${e.message}`);
  process.exit(1);
}

// An SPDX expression is fine when every OR alternative is made of allowed identifiers only
// (AND combinations need all parts allowed, OR combinations need one allowed alternative).
function isAllowed(expr) {
  const text = String(expr).replace(/[()*]/g, " ").trim();
  if (!text) return false;
  return text.split(/\s+OR\s+/i).some((alt) =>
    alt.split(/\s+AND\s+/i).every((id) => ALLOWED.has(id.trim())));
}

const packages = JSON.parse(json);
const violations = [];
for (const [name, info] of Object.entries(packages)) {
  const lic = Array.isArray(info.licenses) ? info.licenses.join(" AND ") : info.licenses;
  if (!isAllowed(lic ?? "")) violations.push(`${name}: ${lic}`);
}

if (violations.length) {
  console.error("license check: disallowed licences in production dependencies:");
  for (const v of violations) console.error(`  ${v}`);
  process.exit(1);
}
console.log(`license check: ok (${Object.keys(packages).length} production packages)`);
