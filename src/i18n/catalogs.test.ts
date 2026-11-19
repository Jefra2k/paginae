/// <reference types="node" />
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";
import de from "./de.json";
import fr from "./fr.json";
import { initI18n } from "./index";

type Catalog = { [key: string]: string | Catalog };

function flatten(catalog: Catalog, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(catalog)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") out[path] = value;
    else Object.assign(out, flatten(value, path));
  }
  return out;
}

function sourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) files.push(...sourceFiles(full));
    else if (/\.(ts|tsx)$/.test(entry)) files.push(full);
  }
  return files;
}

const flatDe = flatten(de as Catalog);
const flatFr = flatten(fr as Catalog);

test("de and fr have the same keys", () => {
  expect(Object.keys(flatFr).sort()).toEqual(Object.keys(flatDe).sort());
});

test("no catalog value is empty", () => {
  for (const [key, value] of [...Object.entries(flatDe), ...Object.entries(flatFr)]) {
    expect(value.trim(), key).not.toBe("");
  }
});

test("every key used in the source exists in de", () => {
  const pattern = /\bt\(\s*["']([a-zA-Z0-9_.]+)["']/g;
  const used = new Set<string>();
  for (const file of sourceFiles(join(process.cwd(), "src"))) {
    for (const match of readFileSync(file, "utf8").matchAll(pattern)) used.add(match[1]);
  }
  expect(used.size).toBeGreaterThan(0);
  const missing = [...used].filter((key) => !(key in flatDe) && !(`${key}_one` in flatDe && `${key}_other` in flatDe));
  expect(missing).toEqual([]);
});

test("initI18n('fr') translates into French", () => {
  const i18n = initI18n("fr");
  expect(i18n.t("modes.read")).toBe("Lecture");
});
