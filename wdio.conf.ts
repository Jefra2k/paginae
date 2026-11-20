// End-to-end tests: WebDriver against the real Paginae binary (see README, "Tests").
// PAGINAE_BIN  path of the built app; PAGINAE_OPEN  PDF the app opens at start-up.
// The app is built with `--features e2e` so that it carries its own WebDriver server
// (tauri-plugin-wdio-webdriver): no external driver, same path on Windows and macOS.
import { existsSync } from "node:fs";

const bin = process.env.PAGINAE_BIN;
if (!bin || !existsSync(bin)) {
  throw new Error(
    `PAGINAE_BIN must point to the built app (e.g. target/release/paginae.exe); got: ${bin ?? "(unset)"}`,
  );
}

export const config = {
  runner: "local",
  specs: ["./e2e/specs/**/*.spec.ts"],
  maxInstances: 1,
  capabilities: [
    { browserName: "tauri", "tauri:options": { application: bin } },
  ],
  services: [
    [
      "@wdio/tauri-service",
      { appBinaryPath: bin, driverProvider: "embedded" },
    ],
  ],
  framework: "mocha",
  reporters: ["spec"],
  mochaOpts: { ui: "bdd", timeout: 60000 },
  outputDir: "e2e/logs",
  logLevel: "info",
};
