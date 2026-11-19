use paginae_core::{
    CoreError, Engine, FormKind, MAX_RENDER_WIDTH_PX, Permissions, Workspace, clamp_render_width,
    default_library_dir, fixtures,
};
use std::path::PathBuf;
use tempfile::TempDir;

fn engine() -> &'static Engine {
    Engine::global(&default_library_dir()).unwrap()
}

fn fixture(name: &str, pages: &[&str]) -> (TempDir, PathBuf) {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join(name);
    fixtures::write_text_pdf(engine(), &path, pages).unwrap();
    (dir, path)
}

#[test]
fn open_reports_pages_form_and_permissions() {
    let (_dir, path) = fixture("drei-seiten.pdf", &["Seite eins", "Seite zwei", "Seite drei"]);
    let ws = Workspace::new(engine());
    let info = ws.open(&path, None).expect("opens");
    assert_eq!(info.page_count, 3);
    assert_eq!(info.pages.len(), 3);
    assert_eq!(info.file_name, "drei-seiten.pdf");
    assert_eq!(info.pages[0].index, 0);
    assert!((info.pages[0].width_pt - 595.3).abs() < 1.0);
    assert!((info.pages[0].height_pt - 841.9).abs() < 1.0);
    assert_eq!(info.pages[0].rotation, 0);
    assert_eq!(info.form, FormKind::None);
    assert_eq!(info.permissions, Permissions::ALL);
    assert!(!info.encrypted);
    assert_eq!(info.title, None);
    assert_eq!(ws.open_ids(), vec![info.id]);
}

#[test]
fn opens_paths_with_accents_and_umlauts() {
    let (_dir, path) = fixture("Élève ü.pdf", &["Bonjour"]);
    let info = Workspace::new(engine()).open(&path, None).expect("opens");
    assert_eq!(info.file_name, "Élève ü.pdf");
}

#[test]
fn ids_are_never_reused_after_close() {
    let (_dir, path) = fixture("a.pdf", &["A"]);
    let ws = Workspace::new(engine());
    let first = ws.open(&path, None).unwrap().id;
    ws.close(first).unwrap();
    let second = ws.open(&path, None).unwrap().id;
    assert_ne!(first, second);
    assert!(matches!(ws.close(first), Err(CoreError::UnknownDocument(id)) if id == first));
}

#[test]
fn render_png_has_requested_width_and_visible_ink() {
    let (_dir, path) = fixture("render.pdf", &["Elternbrief Klassenfahrt"]);
    let ws = Workspace::new(engine());
    let id = ws.open(&path, None).unwrap().id;
    let png = ws.render_png(id, 0, 600).expect("renders");
    let img = image::load_from_memory(&png).expect("valid PNG").into_rgba8();
    assert_eq!(img.width(), 600);
    assert!((img.height() as i64 - 849).abs() <= 1, "got {}", img.height());
    let is_white = |p: &image::Rgba<u8>| p[0] == 255 && p[1] == 255 && p[2] == 255;
    let inked = img.pixels().filter(|p| !is_white(p)).count();
    assert!(
        inked > 200,
        "24 glyphs at 14 pt should ink more than 200 pixels, found {inked}"
    );
    let top_left = img
        .enumerate_pixels()
        .filter(|(x, y, p)| *x < 300 && *y < 212 && !is_white(p))
        .count();
    assert_eq!(top_left, inked, "all ink must be in the top-left quarter");
}

#[test]
fn render_width_is_clamped_to_a_safe_maximum() {
    assert_eq!(clamp_render_width(0), 1);
    assert_eq!(clamp_render_width(900), 900);
    assert_eq!(clamp_render_width(50_000), MAX_RENDER_WIDTH_PX as i32);
}

#[test]
fn render_rejects_missing_page_and_unknown_document() {
    let (_dir, path) = fixture("one.pdf", &["Nur eine Seite"]);
    let ws = Workspace::new(engine());
    let id = ws.open(&path, None).unwrap().id;
    assert!(matches!(
        ws.render_png(id, 1, 100),
        Err(CoreError::PageOutOfRange(1))
    ));
    assert!(matches!(
        ws.render_png(99, 0, 100),
        Err(CoreError::UnknownDocument(99))
    ));
}

#[test]
fn search_is_case_insensitive_and_reports_page_and_rect() {
    let (_dir, path) = fixture("suche.pdf", &["Seite eins", "Ecole d'Echternach", "Seite drei"]);
    let ws = Workspace::new(engine());
    let id = ws.open(&path, None).unwrap().id;
    let hits = ws.search(id, "echternach").expect("searches");
    assert_eq!(hits.len(), 1);
    assert_eq!(hits[0].page_index, 1);
    let r = hits[0].rects[0];
    assert!(r.right > r.left && r.top > r.bottom, "rect {r:?}");
    assert!(
        r.left >= 72.0 && r.top <= 790.0,
        "rect near the text position: {r:?}"
    );
    assert_eq!(ws.search(id, "Seite").unwrap().len(), 2);
    assert!(ws.search(id, "   ").unwrap().is_empty());
    assert!(ws.search(id, "nicht vorhanden").unwrap().is_empty());
}

#[test]
fn has_text_distinguishes_text_from_blank_pages() {
    let (_dir, with) = fixture("text.pdf", &["Seite eins"]);
    let dir = tempfile::tempdir().unwrap();
    let blank = dir.path().join("blank.pdf");
    fixtures::write_blank_pdf(engine(), &blank, 2).unwrap();
    let ws = Workspace::new(engine());
    assert!(ws.has_text(ws.open(&with, None).unwrap().id).unwrap());
    assert!(!ws.has_text(ws.open(&blank, None).unwrap().id).unwrap());
}

#[test]
fn page_text_returns_page_content() {
    let (_dir, path) = fixture("text2.pdf", &["Seite eins", "Seite zwei"]);
    let ws = Workspace::new(engine());
    let id = ws.open(&path, None).unwrap().id;
    assert!(ws.page_text(id, 1).unwrap().contains("Seite zwei"));
}

#[test]
fn bookmarks_are_empty_for_plain_document() {
    let (_dir, path) = fixture("ohne.pdf", &["A"]);
    let ws = Workspace::new(engine());
    assert!(ws.bookmarks(ws.open(&path, None).unwrap().id).unwrap().is_empty());
}

#[test]
fn open_reports_missing_empty_and_non_pdf_files() {
    let dir = tempfile::tempdir().unwrap();
    let ws = Workspace::new(engine());
    assert!(matches!(
        ws.open(&dir.path().join("fehlt.pdf"), None),
        Err(CoreError::Io(_))
    ));
    let empty = dir.path().join("leer.pdf");
    std::fs::write(&empty, b"").unwrap();
    assert!(matches!(ws.open(&empty, None), Err(CoreError::InvalidFormat)));
    let fake = dir.path().join("kein.pdf");
    std::fs::write(&fake, b"Das ist kein PDF").unwrap();
    assert!(matches!(ws.open(&fake, None), Err(CoreError::InvalidFormat)));
}
