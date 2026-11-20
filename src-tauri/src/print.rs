//! The print window: a webview that shows every page as a bitmap and hands over to the system print dialog.

use paginae_core::DocId;
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

use crate::CommandError;

const PRINT_LABEL: &str = "print";

fn failed(err: tauri::Error) -> CommandError {
    log::warn!("print window error: {err}");
    CommandError {
        kind: "engine",
        message: err.to_string(),
    }
}

/// Opens the print window for a document. A window that is still open (an earlier print was neither
/// finished nor cancelled) is closed first, so the new one always shows the requested document.
#[tauri::command(async)]
pub fn print_document(app: AppHandle, id: DocId) -> Result<(), CommandError> {
    if let Some(old) = app.get_webview_window(PRINT_LABEL) {
        old.destroy().map_err(failed)?;
    }
    WebviewWindowBuilder::new(
        &app,
        PRINT_LABEL,
        WebviewUrl::App(format!("print.html?id={id}").into()),
    )
    .title("Paginae")
    .inner_size(900.0, 700.0)
    .center()
    .build()
    .map_err(failed)?;
    log::info!("print window opened for document {id}");
    Ok(())
}

/// Called by the print window once every page image has loaded: opens the system print dialog.
#[tauri::command(async)]
pub fn print_window_ready(app: AppHandle) -> Result<(), CommandError> {
    let window = app.get_webview_window(PRINT_LABEL).ok_or_else(|| CommandError {
        kind: "unknown_document",
        message: "the print window is not open".to_string(),
    })?;
    log::info!("print window ready, opening the system print dialog");
    window.print().map_err(failed)
}

/// Called after printing (or cancelling): closes the print window.
#[tauri::command(async)]
pub fn close_print_window(app: AppHandle) -> Result<(), CommandError> {
    if let Some(window) = app.get_webview_window(PRINT_LABEL) {
        window.destroy().map_err(failed)?;
    }
    Ok(())
}
