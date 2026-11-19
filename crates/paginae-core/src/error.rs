use std::path::PathBuf;

use pdfium_render::prelude::{PdfiumError, PdfiumInternalError};

/// Errors of the PDF core. Every variant is meant to be shown to a teacher in
/// translated form by the UI layer; the UI maps on `kind()`.
#[derive(Debug, thiserror::Error)]
pub enum CoreError {
    #[error("PDF engine could not be loaded from {path}: {source}")]
    EngineLoad { path: PathBuf, source: PdfiumError },
    #[error("the document is protected by a password")]
    PasswordRequired,
    #[error("the password is wrong")]
    WrongPassword,
    #[error("the file is not a readable PDF")]
    InvalidFormat,
    #[error("file error: {0}")]
    Io(#[from] std::io::Error),
    #[error("document {0} is not open")]
    UnknownDocument(u32),
    #[error("page {0} does not exist")]
    PageOutOfRange(u32),
    #[error("engine error: {0}")]
    Engine(String),
}

impl CoreError {
    /// Stable machine-readable kind, used by the UI to pick a translated message.
    pub fn kind(&self) -> &'static str {
        match self {
            CoreError::EngineLoad { .. } => "engine_load",
            CoreError::PasswordRequired => "password_required",
            CoreError::WrongPassword => "wrong_password",
            CoreError::InvalidFormat => "invalid_format",
            CoreError::Io(_) => "io",
            CoreError::UnknownDocument(_) => "unknown_document",
            CoreError::PageOutOfRange(_) => "page_out_of_range",
            CoreError::Engine(_) => "engine",
        }
    }

    /// Maps a load error of PDFium. `had_password` decides between
    /// "password required" and "wrong password" (PDFium reports both the same).
    #[allow(dead_code)] // first used by the document layer in a later task
    pub(crate) fn from_load(err: PdfiumError, had_password: bool) -> CoreError {
        match err {
            PdfiumError::PdfiumLibraryInternalError(PdfiumInternalError::PasswordError) => {
                if had_password {
                    CoreError::WrongPassword
                } else {
                    CoreError::PasswordRequired
                }
            }
            PdfiumError::PdfiumLibraryInternalError(PdfiumInternalError::FormatError) => {
                CoreError::InvalidFormat
            }
            PdfiumError::PdfiumLibraryInternalError(PdfiumInternalError::FileError) => {
                CoreError::Io(std::io::Error::other("PDFium could not read the file"))
            }
            PdfiumError::IoError(e) => CoreError::Io(e),
            other => CoreError::Engine(format!("{other:?}")),
        }
    }
}

impl From<PdfiumError> for CoreError {
    fn from(err: PdfiumError) -> Self {
        match err {
            PdfiumError::IoError(e) => CoreError::Io(e),
            other => CoreError::Engine(format!("{other:?}")),
        }
    }
}
