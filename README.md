# Paginae

Paginae is a free, open-source PDF tool for teachers and school staff (Windows and macOS). **Status: in development, not yet for use.**

## Build

Run `npm run fetch:pdfium` before any `cargo build` or `cargo test`: the bundle resources reference the fetched PDFium files.

```
npm ci
npm run fetch:pdfium
npm run tauri dev
```

## Tests

Run `npm run fetch:pdfium` first (once), because the bundle resources reference the fetched files.

```
cargo test --workspace      # Rust unit and integration tests
npm test                    # TypeScript tests (vitest)
npm run check:licenses      # npm production dependencies: permissive licences only
cargo deny check licenses bans   # Rust dependencies: permissive licences only (cargo install cargo-deny --locked)
npm run check:network       # fails if a network-capable dependency is locked in
npm run e2e                 # end-to-end test against the built app (see below)
```

The end-to-end test starts the real app and checks that it opens a PDF and renders page 1. The app carries its own WebDriver server, which is compiled in only with `--features e2e` (and needs a generated, git-ignored capability file), so it is built separately from the release build. Create the fixture and build first (Windows shown; on macOS the binary is `target/aarch64-apple-darwin/release/paginae` and the build takes `--target aarch64-apple-darwin`):

```
cargo run -p paginae-core --example make_fixture -- e2e/.tmp/fixture.pdf
node scripts/enable-e2e-capability.mjs
npm run tauri build -- --no-bundle -- --features e2e
$env:PAGINAE_BIN = "target\release\paginae.exe"
$env:PAGINAE_OPEN = "$PWD\e2e\.tmp\fixture.pdf"
npm run e2e
```

Run `npm run e2e:clean` afterwards (it deletes `src-tauri/capabilities/e2e.json`): while that file exists, `cargo test`, `cargo clippy`, `tauri dev` and `tauri build` all fail, because tauri-build validates the capability and the plugin it names is not compiled in.

## Structure

- `crates/paginae-core`: the PDF logic (PDFium via pdfium-render), independent of the desktop shell
- `src-tauri`: the Tauri 2 desktop shell (Rust commands, window, bundling)
- `src`: the React and TypeScript user interface

## License

MIT, see [LICENSE](LICENSE). Third-party components are listed in [docs/THIRD-PARTY.md](docs/THIRD-PARTY.md).
