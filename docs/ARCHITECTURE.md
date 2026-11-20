# Architecture

Paginae is a desktop PDF tool in three layers. Stage 1 only reads documents; nothing is written and no network connection is opened (`npm run check:network` guards that).

| Layer | Where | Responsibility |
|---|---|---|
| Core | `crates/paginae-core` | All PDF logic on top of PDFium (via `pdfium-render`). No dependency on Tauri. |
| Shell | `src-tauri` | Tauri 2 commands, windows, logging, bundling. Translates `CoreError` into `CommandError`. |
| UI | `src` | React and TypeScript. Talks to the shell only through the `Backend` interface (`src/backend/Backend.ts`). |

## Path of a render call

1. The viewer asks its `RenderCache` (`src/viewer/RenderCache.ts`), which calls `Backend.renderPage(id, pageIndex, widthPx)` for pages it does not hold yet.
2. `tauriBackend` calls `invoke("render_page", { id, pageIndex, widthPx })`.
3. The command `render_page` in `src-tauri/src/lib.rs` runs on a worker thread (`#[tauri::command(async)]`, otherwise the UI freezes while PDFium renders) and calls `Workspace::render_png`. Every command that touches the workspace (and the other commands for uniformity) is `#[tauri::command(async)]`: a plain command runs on the event-loop thread and would block the whole window while it waits for the workspace lock that a render holds.
4. `render_png` renders the page with form data and annotations, scales it to the requested width (clamped to `1..=MAX_RENDER_WIDTH_PX`) and returns PNG bytes.
5. The command wraps the bytes in `tauri::ipc::Response`; the UI receives an `ArrayBuffer`.
6. `pngBlob` (`src/backend/pngBlob.ts`) turns it into a `Blob` (it also accepts a plain number array, which the WebDriver channel delivers), and the image is shown through a blob URL; the cache keeps the bitmaps it has fetched.

## Coordinate systems

PDF space is in points (1/72 inch) with the origin at the **bottom left**; CSS space is in pixels with the origin at the **top left**. `RectPt` values from the core (search hits) are in unrotated page space. `rectPtToCss` in `src/viewer/geometry.ts` is the **only** place where points become CSS pixels; it also handles the page rotation. `PageInfo.width_pt` and `height_pt` are already the displayed size (after rotation), because PDFium reports them that way.

## State

`DocumentsState` (`src/state/documents.tsx`) is a reducer holding `order` (tab order), `docs` (per document: `info`, `zoom`, `currentPage`, `hasText`) and `activeId`. Closing the active tab activates the right neighbour, else the left one. The state lives only in the UI; the core keeps the open PDFium documents in `Workspace`, keyed by `DocId`. Recently opened files are persisted separately with the store plugin (`recent.json`).

## One `Engine` per process

`Engine` (`crates/paginae-core/src/engine.rs`) binds the PDFium library once; `Engine::global` returns the same instance on every call, because pdfium-render binds a process at most once. PDFium is not thread-safe; pdfium-render's `thread_safe` feature serialises every call behind a mutex, so one `Engine` and one `Workspace` (managed state `AppState`) are shared by all command threads. The library is found as a bundled resource, or in debug builds under `resources/pdfium/<platform>` (fetched by `scripts/fetch-pdfium.mjs` with a pinned version and SHA-256). If it cannot be loaded, the shell shows a native error dialog and exits.

## Application windows

The main window loads `index.html`. Printing opens a second window (label `print`, `src/print`, `print.html`, capability `src-tauri/capabilities/print.json`): it renders every page as a 300 dpi bitmap, calls `print_window_ready`, which calls `print()` on the print window, and `close_print_window` ends it. On Windows `print()` is `window.print()` (wry, WebView2), so the user sees the Edge/WebView2 print preview, not the Win32 print dialog. Each page sits in a sheet box of 100vw by 100vh (`.print-sheet`) with the image scaled to fit (`object-fit: contain`), so pages of any aspect ratio take exactly one sheet. An open print window is reused for the next print job.

## Logging

`tauri-plugin-log` writes to stdout and to `paginae.log` in the log directory (Windows: `%LOCALAPPDATA%\lu.paginae.app\logs`; macOS: `~/Library/Logs/lu.paginae.app`). The log holds file names only (never the directory), counts and timings, never document content. Rotation keeps one old file of at most 2 MB.

## Tests

- Rust: unit and integration tests in `crates/paginae-core/tests` (`engine`, `engine_error`, `workspace`) against PDFs that `paginae_core::fixtures` generates with PDFium itself; no third-party documents are checked in.
- UI: Vitest with Testing Library; components get a `FakeBackend` (`src/backend/fakeBackend.ts`) instead of Tauri. `src/i18n/catalogs.test.ts` fails on missing or empty keys in either language.
- End to end: WebdriverIO (`e2e/specs`, `wdio.conf.ts`) against the real binary, built with `--features e2e` so that it carries its own WebDriver server. It proves that a PDF opens and page 1 renders; everything else is covered by the layers above and by the manual test.
- Checks in CI: `check:licenses` (npm), `cargo deny` (Rust), `check:network`.

## Conventions

- Errors: every `CoreError` variant has a stable `kind()` string (`password_required`, `wrong_password`, `invalid_format`, `io`, `unknown_document`, `page_out_of_range`, `engine_load`, `engine`). The shell sends `{ kind, message }`; `message` is English and for the log only.
- UI texts: never hard-coded. Every visible string comes from `src/i18n/de.json` or `fr.json` (German is the default). `errorText` maps `errors.<kind>` to the catalog text and falls back to `errors.unknown`.
- Identifiers and developer documentation are English; the user interface is German and French.
- Commit messages follow Conventional Commits.
