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
cargo test --workspace
npm test
```

## Structure

- `crates/paginae-core`: the PDF logic (PDFium via pdfium-render), independent of the desktop shell
- `src-tauri`: the Tauri 2 desktop shell (Rust commands, window, bundling)
- `src`: the React and TypeScript user interface

## License

MIT, see [LICENSE](LICENSE). Third-party components are listed in [docs/THIRD-PARTY.md](docs/THIRD-PARTY.md).
