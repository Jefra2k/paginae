// End-to-end tests: WebDriver against the real Paginae binary (see README, "Tests").
// PAGINAE_BIN  path of the built app; PAGINAE_OPEN  PDF the app opens at start-up.
// The app is built with `--features e2e` so that it carries its own WebDriver server
// (tauri-plugin-wdio-webdriver): no external driver, same path on Windows and macOS.
export const config = {
  runner: "local",
  specs: ["./e2e/specs/**/*.spec.ts"],
  maxInstances: 1,
  capabilities: [
    { browserName: "tauri", "tauri:options": { application: process.env.PAGINAE_BIN } },
  ],
  services: [
    [
      "@wdio/tauri-service",
      { appBinaryPath: process.env.PAGINAE_BIN, driverProvider: "embedded" },
    ],
  ],
  framework: "mocha",
  reporters: ["spec"],
  mochaOpts: { ui: "bdd", timeout: 60000 },
  outputDir: "e2e/logs",
  logLevel: "info",
};
