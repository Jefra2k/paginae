use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::sync::atomic::{AtomicU32, Ordering};

use image::codecs::png::{CompressionType, FilterType, PngEncoder};
use image::{ExtendedColorType, ImageEncoder};
use pdfium_render::prelude::*;
use serde::Serialize;

use crate::engine::Engine;
use crate::error::CoreError;

/// Handle of an open document, handed to the UI. Never reused within a process.
pub type DocId = u32;

/// Widest bitmap the core will render (an A4 page at 8000 px wide is ~360 MB RGBA).
pub const MAX_RENDER_WIDTH_PX: u32 = 8000;

#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct DocumentInfo {
    pub id: DocId,
    pub path: String,
    pub file_name: String,
    pub title: Option<String>,
    pub page_count: u32,
    pub pages: Vec<PageInfo>,
    pub form: FormKind,
    pub permissions: Permissions,
    pub encrypted: bool,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct PageInfo {
    pub index: u32,
    /// Size in PDF points (1/72 inch) as displayed, i.e. after the page's own rotation.
    pub width_pt: f32,
    pub height_pt: f32,
    /// 0, 90, 180 or 270.
    pub rotation: u16,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum FormKind {
    None,
    AcroForm,
    /// XFA forms are rejected by Paginae with a hint to use Acrobat Reader.
    Xfa,
}

/// Owner-password restrictions. `true` means the action is allowed.
#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
pub struct Permissions {
    pub print: bool,
    pub modify: bool,
    pub copy: bool,
    pub annotate: bool,
    pub fill_forms: bool,
    pub assemble: bool,
}

impl Permissions {
    pub const ALL: Permissions = Permissions {
        print: true,
        modify: true,
        copy: true,
        annotate: true,
        fill_forms: true,
        assemble: true,
    };
}

/// Rectangle in PDF points, origin bottom-left as in the PDF coordinate system.
#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
pub struct RectPt {
    pub left: f32,
    pub bottom: f32,
    pub right: f32,
    pub top: f32,
}

impl From<PdfRect> for RectPt {
    fn from(r: PdfRect) -> Self {
        RectPt {
            left: r.left().value,
            bottom: r.bottom().value,
            right: r.right().value,
            top: r.top().value,
        }
    }
}

#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct SearchHit {
    pub page_index: u32,
    pub rects: Vec<RectPt>,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct Bookmark {
    pub title: String,
    pub page_index: Option<u32>,
    pub children: Vec<Bookmark>,
}

struct OpenDocument {
    path: PathBuf,
    pdf: PdfDocument<'static>,
    encrypted: bool,
}

/// All documents open in the process. One per application; the desktop shell
/// keeps it in managed state.
pub struct Workspace {
    engine: &'static Engine,
    docs: Mutex<HashMap<DocId, OpenDocument>>,
    next_id: AtomicU32,
}

/// Clamps a requested render width to `1..=MAX_RENDER_WIDTH_PX` as PDFium pixels.
pub fn clamp_render_width(requested: u32) -> i32 {
    requested.clamp(1, MAX_RENDER_WIDTH_PX) as i32
}

impl Workspace {
    pub fn new(engine: &'static Engine) -> Self {
        Workspace {
            engine,
            docs: Mutex::new(HashMap::new()),
            next_id: AtomicU32::new(1),
        }
    }

    /// Opens a PDF. `password` is the user password of an encrypted file; pass
    /// `None` first and retry on [`CoreError::PasswordRequired`].
    pub fn open(&self, path: &Path, password: Option<&str>) -> Result<DocumentInfo, CoreError> {
        let pdf = self
            .engine
            .pdfium()
            .load_pdf_from_file(path, password)
            .map_err(|e| CoreError::from_load(e, password.is_some()))?;
        let id = self.next_id.fetch_add(1, Ordering::SeqCst);
        let doc = OpenDocument {
            path: path.to_path_buf(),
            pdf,
            // The UI only passes a password after `PasswordRequired`, so this equals "the file is encrypted".
            encrypted: password.is_some(),
        };
        let info = describe(id, &doc)?;
        self.docs.lock().expect("workspace lock").insert(id, doc);
        Ok(info)
    }

    pub fn close(&self, id: DocId) -> Result<(), CoreError> {
        self.docs
            .lock()
            .expect("workspace lock")
            .remove(&id)
            .map(|_| ())
            .ok_or(CoreError::UnknownDocument(id))
    }

    pub fn open_ids(&self) -> Vec<DocId> {
        let mut ids: Vec<DocId> = self
            .docs
            .lock()
            .expect("workspace lock")
            .keys()
            .copied()
            .collect();
        ids.sort_unstable();
        ids
    }

    pub fn info(&self, id: DocId) -> Result<DocumentInfo, CoreError> {
        self.with_doc(id, |doc| describe(id, doc))
    }

    /// Renders one page, including form fields and annotations, scaled so that
    /// its displayed width is `target_width_px` (clamped), and returns PNG bytes.
    pub fn render_png(&self, id: DocId, page_index: u32, target_width_px: u32) -> Result<Vec<u8>, CoreError> {
        self.with_doc(id, |doc| {
            let page = get_page(&doc.pdf, page_index)?;
            let config = PdfRenderConfig::new()
                .set_target_width(clamp_render_width(target_width_px))
                .render_form_data(true)
                .render_annotations(true);
            let image = page.render_with_config(&config)?.as_image()?;
            let rgba = image.into_rgba8();
            let mut png = Vec::new();
            PngEncoder::new_with_quality(&mut png, CompressionType::Fast, FilterType::NoFilter)
                .write_image(
                    rgba.as_raw(),
                    rgba.width(),
                    rgba.height(),
                    ExtendedColorType::Rgba8,
                )
                .map_err(|e| CoreError::Engine(format!("PNG encoding failed: {e}")))?;
            Ok(png)
        })
    }

    /// Plain text of one page, in reading order as PDFium reports it.
    pub fn page_text(&self, id: DocId, page_index: u32) -> Result<String, CoreError> {
        self.with_doc(id, |doc| Ok(get_page(&doc.pdf, page_index)?.text()?.all()))
    }

    /// `true` if any page carries extractable text (a scan without OCR has none).
    pub fn has_text(&self, id: DocId) -> Result<bool, CoreError> {
        self.with_doc(id, |doc| {
            for page in doc.pdf.pages().iter() {
                if !page.text()?.all().trim().is_empty() {
                    return Ok(true);
                }
            }
            Ok(false)
        })
    }

    /// Case-insensitive search over all pages. One hit per match, with the
    /// bounding rectangles of the matched text segments.
    pub fn search(&self, id: DocId, query: &str) -> Result<Vec<SearchHit>, CoreError> {
        if query.trim().is_empty() {
            return Ok(Vec::new());
        }
        self.with_doc(id, |doc| {
            let options = PdfSearchOptions::new().match_case(false).match_whole_word(false);
            let mut hits = Vec::new();
            for (index, page) in doc.pdf.pages().iter().enumerate() {
                let text = page.text()?;
                let search = text.search(query, &options)?;
                for segments in search.iter(PdfSearchDirection::SearchForward) {
                    let rects: Vec<RectPt> = segments.iter().map(|s| s.bounds().into()).collect();
                    hits.push(SearchHit {
                        page_index: index as u32,
                        rects,
                    });
                }
            }
            Ok(hits)
        })
    }

    pub fn bookmarks(&self, id: DocId) -> Result<Vec<Bookmark>, CoreError> {
        self.with_doc(id, |doc| {
            let mut budget = MAX_BOOKMARK_NODES;
            Ok(walk_outline(
                doc.pdf.bookmarks().root(),
                0,
                &mut budget,
                &bookmark_node,
            ))
        })
    }

    fn with_doc<T>(
        &self,
        id: DocId,
        f: impl FnOnce(&OpenDocument) -> Result<T, CoreError>,
    ) -> Result<T, CoreError> {
        let docs = self.docs.lock().expect("workspace lock");
        let doc = docs.get(&id).ok_or(CoreError::UnknownDocument(id))?;
        f(doc)
    }
}

/// A malformed outline may loop or nest without end; the walk stops silently at these caps.
const MAX_BOOKMARK_DEPTH: usize = 64;
const MAX_BOOKMARK_NODES: usize = 10_000;

/// One bookmark without its children, plus its first child and next sibling.
fn bookmark_node<'a>(
    bookmark: &PdfBookmark<'a>,
) -> (Bookmark, Option<PdfBookmark<'a>>, Option<PdfBookmark<'a>>) {
    (
        Bookmark {
            title: bookmark.title().unwrap_or_default(),
            page_index: bookmark
                .destination()
                .and_then(|d| d.page_index().ok())
                .map(|i| i as u32),
            children: Vec::new(),
        },
        bookmark.first_child(),
        bookmark.next_sibling(),
    )
}

/// Collects `first` and its following siblings with their subtrees, within the depth and node caps.
fn walk_outline<N>(
    first: Option<N>,
    depth: usize,
    budget: &mut usize,
    node: &impl Fn(&N) -> (Bookmark, Option<N>, Option<N>),
) -> Vec<Bookmark> {
    let mut out = Vec::new();
    if depth >= MAX_BOOKMARK_DEPTH {
        return out;
    }
    let mut current = first;
    while let Some(n) = current {
        if *budget == 0 {
            break;
        }
        *budget -= 1;
        let (mut bookmark, child, next) = node(&n);
        bookmark.children = walk_outline(child, depth + 1, budget, node);
        out.push(bookmark);
        current = next;
    }
    out
}

fn get_page<'a>(pdf: &'a PdfDocument<'static>, page_index: u32) -> Result<PdfPage<'a>, CoreError> {
    if i64::from(page_index) >= i64::from(pdf.pages().len()) {
        return Err(CoreError::PageOutOfRange(page_index));
    }
    Ok(pdf.pages().get(page_index as PdfPageIndex)?)
}

fn describe(id: DocId, doc: &OpenDocument) -> Result<DocumentInfo, CoreError> {
    let pdf = &doc.pdf;
    let mut pages = Vec::new();
    for (index, page) in pdf.pages().iter().enumerate() {
        let rotation = match page.rotation()? {
            PdfPageRenderRotation::None => 0,
            PdfPageRenderRotation::Degrees90 => 90,
            PdfPageRenderRotation::Degrees180 => 180,
            PdfPageRenderRotation::Degrees270 => 270,
        };
        let (w, h) = (page.width().value, page.height().value);
        // PDFium already reports the displayed size (after /Rotate); no swap needed.
        let (width_pt, height_pt) = (w, h);
        pages.push(PageInfo {
            index: index as u32,
            width_pt,
            height_pt,
            rotation,
        });
    }
    let form = match pdf.form().map(|f| f.form_type()) {
        None | Some(PdfFormType::None) => FormKind::None,
        Some(PdfFormType::Acrobat) => FormKind::AcroForm,
        Some(PdfFormType::XfaFull) | Some(PdfFormType::XfaForeground) => FormKind::Xfa,
    };
    // Deliberately fail-open: a permissions query error must not lock a teacher out of printing.
    let p = pdf.permissions();
    let permissions = Permissions {
        print: p.can_print_high_quality().unwrap_or(true) || p.can_print_only_low_quality().unwrap_or(true),
        modify: p.can_modify_document_content().unwrap_or(true),
        copy: p.can_extract_text_and_graphics().unwrap_or(true),
        annotate: p.can_add_or_modify_text_annotations().unwrap_or(true),
        fill_forms: p.can_fill_existing_interactive_form_fields().unwrap_or(true),
        assemble: p.can_assemble_document().unwrap_or(true),
    };
    let title = pdf
        .metadata()
        .get(PdfDocumentMetadataTagType::Title)
        .map(|t| t.value().to_string())
        .filter(|t| !t.trim().is_empty());
    Ok(DocumentInfo {
        id,
        path: doc.path.to_string_lossy().into_owned(),
        file_name: doc
            .path
            .file_name()
            .map(|n| n.to_string_lossy().into_owned())
            .unwrap_or_default(),
        title,
        page_count: pages.len() as u32,
        pages,
        form,
        permissions,
        encrypted: doc.encrypted,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn leaf() -> Bookmark {
        Bookmark {
            title: String::new(),
            page_index: None,
            children: Vec::new(),
        }
    }

    fn depth_of(list: &[Bookmark]) -> usize {
        list.iter().map(|b| 1 + depth_of(&b.children)).max().unwrap_or(0)
    }

    fn count(list: &[Bookmark]) -> usize {
        list.iter().map(|b| 1 + count(&b.children)).sum()
    }

    #[test]
    fn outline_whose_child_is_itself_stops_at_the_depth_cap() {
        let mut budget = MAX_BOOKMARK_NODES;
        let tree = walk_outline(Some(0_u8), 0, &mut budget, &|_| (leaf(), Some(0), None));
        assert_eq!(depth_of(&tree), MAX_BOOKMARK_DEPTH);
    }

    #[test]
    fn outline_whose_sibling_is_itself_stops_at_the_node_cap() {
        let mut budget = MAX_BOOKMARK_NODES;
        let tree = walk_outline(Some(0_u8), 0, &mut budget, &|_| (leaf(), None, Some(0)));
        assert_eq!(count(&tree), MAX_BOOKMARK_NODES);
    }

    #[test]
    fn wide_and_deep_cycle_never_exceeds_the_shared_node_budget() {
        let mut budget = MAX_BOOKMARK_NODES;
        let tree = walk_outline(Some(0_u8), 0, &mut budget, &|_| (leaf(), Some(0), Some(0)));
        assert!(count(&tree) <= MAX_BOOKMARK_NODES);
    }
}
