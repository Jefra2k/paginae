#!/usr/bin/env node
// Fails if a dependency that can open network connections is locked in. Paginae makes no
// network connection in stage 1; this keeps it that way.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Exceptions, each with a reason. Stage 5 adds the updater's use of `reqwest` (via
// tauri-plugin-updater) here, with the justification that it only serves the update check.
// Until then: `tauri` lists reqwest (and with it hyper and hyper-util) as a dependency for
// Android and iOS targets only (`cfg(any(target_os = "android", all(target_vendor = "apple",
// not(target_os = "macos"))))`). Cargo.lock records it, but it is never compiled for Windows
// or macOS (`cargo tree -i reqwest --target x86_64-pc-windows-msvc` finds nothing).
const ALLOWED = ["reqwest", "hyper", "hyper-util"];

const CRATES = ["reqwest", "hyper", "hyper-util", "ureq", "curl", "isahc", "surf", "attohttpc",
  "tokio-tungstenite", "tungstenite", "async-tungstenite"];
const NPM = ["axios", "node-fetch", "undici", "ws", "socket.io-client", "got", "ky"];

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const hits = [];

const cargoLock = readFileSync(join(root, "Cargo.lock"), "utf8");
for (const m of cargoLock.matchAll(/^name = "([^"]+)"/gm)) {
  if (CRATES.includes(m[1]) && !ALLOWED.includes(m[1])) hits.push(`Cargo.lock: ${m[1]}`);
}

const lock = JSON.parse(readFileSync(join(root, "package-lock.json"), "utf8"));
for (const [path, info] of Object.entries(lock.packages ?? {})) {
  if (!path || info.dev) continue;
  const name = path.split("node_modules/").pop();
  if (NPM.includes(name) && !ALLOWED.includes(name)) hits.push(`package-lock.json: ${name} (${path})`);
}

if (hits.length) {
  console.error("network check: network-capable dependencies found:");
  for (const h of hits) console.error(`  ${h}`);
  process.exit(1);
}
console.log("network check: ok");
