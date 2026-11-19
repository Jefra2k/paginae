# Paginae

Paginae is a free, open-source PDF tool for teachers and school staff (Windows and macOS). **Status: in development, not yet for use.**

## Build

```
npm ci
npm run fetch:pdfium
npm run tauri dev
```

## Tests

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
