# Third-party components

| Component | Version | License | Use |
|---|---|---|---|
| PDFium | chromium/8165 | BSD-3-Clause | PDF rendering and editing engine |
| pdfium-binaries | chromium/8165 | MIT | Prebuilt PDFium libraries for Windows and macOS |
| pdfium-render | 0.9.5 | MIT/Apache-2.0 | Rust bindings for PDFium |
| Tauri | 2 | MIT/Apache-2.0 | Desktop application framework |
| React | 19 | MIT | User interface |
| Lucide | to be pinned | ISC | Icons |
| WebdriverIO (`@wdio/cli`, `@wdio/mocha-framework`, `@wdio/local-runner`, `@wdio/spec-reporter`) | 10.2.0 | MIT | End-to-end test runner (dev only, not shipped) |
| `@wdio/tauri-service` | 1.5.1 | MIT | WebdriverIO service for Tauri apps (dev only, not shipped) |
| `tauri-plugin-wdio-webdriver` | 1.5.1 | MIT | Embedded WebDriver server, compiled only with the `e2e` feature (macOS end-to-end test, not shipped) |
| tauri-driver | 2.1.0 | Apache-2.0 OR MIT | WebDriver bridge for the Windows end-to-end test; installed on demand by the test run (dev tool, not shipped) |
| license-checker-rseidelsohn | 5.0.1 | BSD-3-Clause | npm licence check, `npm run check:licenses` (dev only) |
| cargo-deny | 0.22.0 | MIT OR Apache-2.0 | Rust licence check, `cargo deny check licenses bans` (dev tool, run in CI) |
