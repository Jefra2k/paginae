use paginae_core::{Bookmark, CoreError, DocId, DocumentInfo, Engine, SearchHit, Workspace};
use tauri::ipc::Response;
use tauri::path::BaseDirectory;
use tauri::{Manager, State};

/// Error shape sent to the UI: `kind` selects the translated message,
/// `message` is the English detail for the log.
#[derive(Debug, serde::Serialize)]
pub struct CommandError {
    pub kind: &'static str,
    pub message: String,
}

impl From<CoreError> for CommandError {
    fn from(err: CoreError) -> Self {
        log::warn!("core error ({}): {err}", err.kind());
        CommandError {
            kind: err.kind(),
            message: err.to_string(),
        }
    }
}

pub struct AppState {
    pub workspace: Workspace,
}

fn file_name(path: &str) -> String {
    std::path::Path::new(path)
        .file_name()
        .map(|n| n.to_string_lossy().into_owned())
        .unwrap_or_default()
}

#[tauri::command]
fn open_document(
    state: State<'_, AppState>,
    path: String,
    password: Option<String>,
) -> Result<DocumentInfo, CommandError> {
    let info = state
        .workspace
        .open(std::path::Path::new(&path), password.as_deref())?;
    log::info!(
        "opened {} ({} pages, form {:?})",
        file_name(&path),
        info.page_count,
        info.form
    );
    Ok(info)
}

#[tauri::command]
fn close_document(state: State<'_, AppState>, id: DocId) -> Result<(), CommandError> {
    Ok(state.workspace.close(id)?)
}

#[tauri::command]
fn document_info(state: State<'_, AppState>, id: DocId) -> Result<DocumentInfo, CommandError> {
    Ok(state.workspace.info(id)?)
}

/// Returns PNG bytes; the UI receives an `ArrayBuffer`.
#[tauri::command]
fn render_page(
    state: State<'_, AppState>,
    id: DocId,
    page_index: u32,
    width_px: u32,
) -> Result<Response, CommandError> {
    let started = std::time::Instant::now();
    let png = state.workspace.render_png(id, page_index, width_px)?;
    log::debug!(
        "rendered page {page_index} of document {id} at {width_px} px: {} bytes in {} ms",
        png.len(),
        started.elapsed().as_millis()
    );
    Ok(Response::new(png))
}

#[tauri::command]
fn search_document(
    state: State<'_, AppState>,
    id: DocId,
    query: String,
) -> Result<Vec<SearchHit>, CommandError> {
    Ok(state.workspace.search(id, &query)?)
}

#[tauri::command]
fn document_bookmarks(state: State<'_, AppState>, id: DocId) -> Result<Vec<Bookmark>, CommandError> {
    Ok(state.workspace.bookmarks(id)?)
}

#[tauri::command]
fn document_has_text(state: State<'_, AppState>, id: DocId) -> Result<bool, CommandError> {
    Ok(state.workspace.has_text(id)?)
}

/// File to open at start-up (`PAGINAE_OPEN`), used by end-to-end tests.
#[tauri::command]
fn startup_file() -> Option<String> {
    std::env::var("PAGINAE_OPEN").ok().filter(|p| !p.is_empty())
}

/// Directory holding the PDFium library: the bundled resource, or in debug
/// builds the workspace copy under `resources/pdfium/<platform>`.
fn pdfium_dir(app: &tauri::App) -> std::path::PathBuf {
    let bundled = app
        .path()
        .resolve("pdfium", BaseDirectory::Resource)
        .unwrap_or_default();
    if bundled.join(libname()).exists() {
        return bundled;
    }
    #[cfg(debug_assertions)]
    {
        return paginae_core::default_library_dir();
    }
    #[allow(unreachable_code)]
    bundled
}

fn libname() -> &'static str {
    if cfg!(target_os = "windows") {
        "pdfium.dll"
    } else if cfg!(target_os = "macos") {
        "libpdfium.dylib"
    } else {
        "libpdfium.so"
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(log::LevelFilter::Info)
                .level_for("paginae_lib", log::LevelFilter::Debug)
                .targets([
                    tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Stdout),
                    tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::LogDir {
                        file_name: Some("paginae".to_string()),
                    }),
                ])
                .max_file_size(2_000_000)
                .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepOne)
                .build(),
        );
    #[cfg(feature = "e2e")]
    let builder = builder.plugin(tauri_plugin_wdio_webdriver::init());
    builder
        .setup(|app| {
            let dir = pdfium_dir(app);
            log::info!(
                "Paginae {} starting, PDFium from {}",
                app.package_info().version,
                dir.display()
            );
            let engine = Engine::global(&dir)?;
            app.manage(AppState {
                workspace: Workspace::new(engine),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            open_document,
            close_document,
            document_info,
            render_page,
            search_document,
            document_bookmarks,
            document_has_text,
            startup_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
