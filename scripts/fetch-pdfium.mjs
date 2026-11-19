#!/usr/bin/env node
// Downloads the pinned PDFium build for this platform (or --all) into resources/pdfium/.
import { createHash } from "node:crypto";
import { mkdirSync, existsSync, readFileSync, writeFileSync, rmSync, cpSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

export const RELEASE = "chromium/8165";
export const BUILDS = {
  "win-x64": { asset: "pdfium-win-x64.tgz", lib: "bin/pdfium.dll",
    sha256: "ca7338ae7779b8b1b82f4580305c4d762d214f8df1d54b47647fe3cc75989ded" },
  "mac-arm64": { asset: "pdfium-mac-arm64.tgz", lib: "lib/libpdfium.dylib",
    sha256: "112e74d717f3e0310273b70f3c8780e8a61ff11b34834124465c8305c841d350" },
};

export function currentPlatform() {
  const key = `${process.platform}-${process.arch}`;
  return { "win32-x64": "win-x64", "darwin-arm64": "mac-arm64" }[key]
    ?? (() => { throw new Error(`no PDFium build for ${key}`); })();
}

export async function fetchBuild(platform, root) {
  const build = BUILDS[platform];
  const target = join(root, "resources", "pdfium", platform);
  const libPath = join(target, build.lib.split("/").pop());
  if (existsSync(libPath)) { console.log(`${platform}: present`); return libPath; }
  const url = `https://github.com/bblanchon/pdfium-binaries/releases/download/${encodeURIComponent(RELEASE)}/${build.asset}`;
  const bytes = Buffer.from(await (await fetch(url)).arrayBuffer());
  const sha = createHash("sha256").update(bytes).digest("hex");
  if (sha !== build.sha256) throw new Error(`${build.asset}: checksum ${sha} differs from pinned ${build.sha256}`);
  const work = join(tmpdir(), `pdfium-${platform}-${Date.now()}`);
  mkdirSync(work, { recursive: true });
  writeFileSync(join(work, build.asset), bytes);
  execFileSync("tar", ["-xzf", join(work, build.asset), "-C", work]);
  mkdirSync(target, { recursive: true });
  cpSync(join(work, build.lib), libPath);
  cpSync(join(work, "LICENSE"), join(root, "resources", "pdfium", "LICENSE-pdfium-binaries.txt"));
  cpSync(join(work, "VERSION"), join(root, "resources", "pdfium", "VERSION"));
  cpSync(join(work, "licenses"), join(root, "resources", "pdfium", "licenses"), { recursive: true });
  rmSync(work, { recursive: true, force: true });
  console.log(`${platform}: fetched ${build.asset} (${bytes.length} bytes, sha256 ok)`);
  return libPath;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const platforms = process.argv.includes("--all") ? Object.keys(BUILDS) : [currentPlatform()];
  for (const p of platforms) await fetchBuild(p, root);
}
