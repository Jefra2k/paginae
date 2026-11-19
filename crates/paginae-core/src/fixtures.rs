//! Fixture PDFs for tests and demos, generated with PDFium itself so that no
//! foreign document is ever checked in.

use std::path::Path;

use pdfium_render::prelude::*;

use crate::engine::Engine;
use crate::error::CoreError;

/// Writes an A4 document with one page per entry of `pages`; each page shows
/// its text in 14 pt Helvetica near the top-left corner (x 72 pt, baseline 760 pt).
pub fn write_text_pdf(engine: &Engine, path: &Path, pages: &[&str]) -> Result<(), CoreError> {
    let mut doc = engine.pdfium().create_new_pdf()?;
    let font = doc.fonts_mut().helvetica();
    for text in pages {
        let mut page = doc.pages_mut().create_page_at_end(PdfPagePaperSize::a4())?;
        page.objects_mut().create_text_object(
            PdfPoints::new(72.0),
            PdfPoints::new(760.0),
            text,
            font,
            PdfPoints::new(14.0),
        )?;
    }
    doc.save_to_file(path)?;
    Ok(())
}

/// Writes `pages` empty A4 pages (a stand-in for a scan without text layer).
pub fn write_blank_pdf(engine: &Engine, path: &Path, pages: u32) -> Result<(), CoreError> {
    let mut doc = engine.pdfium().create_new_pdf()?;
    for _ in 0..pages {
        doc.pages_mut().create_page_at_end(PdfPagePaperSize::a4())?;
    }
    doc.save_to_file(path)?;
    Ok(())
}

/// Like [`write_text_pdf`], but every page carries the given /Rotate value.
pub fn write_rotated_pdf(
    engine: &Engine,
    path: &Path,
    pages: &[&str],
    rotation: PdfPageRenderRotation,
) -> Result<(), CoreError> {
    let mut doc = engine.pdfium().create_new_pdf()?;
    let font = doc.fonts_mut().helvetica();
    for text in pages {
        let mut page = doc.pages_mut().create_page_at_end(PdfPagePaperSize::a4())?;
        page.objects_mut().create_text_object(
            PdfPoints::new(72.0),
            PdfPoints::new(760.0),
            text,
            font,
            PdfPoints::new(14.0),
        )?;
        page.set_rotation(rotation);
    }
    doc.save_to_file(path)?;
    Ok(())
}
