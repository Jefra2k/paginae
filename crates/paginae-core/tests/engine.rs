use paginae_core::{Engine, default_library_dir, fixtures};

#[test]
fn global_engine_loads_bundled_library_once() {
    let a = Engine::global(&default_library_dir()).expect("loads");
    let b = Engine::global(std::path::Path::new("ignored-after-first-load")).expect("returns existing");
    assert!(std::ptr::eq(a, b));
}

#[test]
fn text_fixture_is_a_pdf_with_one_page_per_entry() {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("fixture.pdf");
    let engine = Engine::global(&default_library_dir()).unwrap();
    fixtures::write_text_pdf(engine, &path, &["eins", "zwei"]).unwrap();
    let bytes = std::fs::read(&path).unwrap();
    assert!(bytes.starts_with(b"%PDF-1."), "header was {:?}", &bytes[..8]);
    let doc = engine.pdfium().load_pdf_from_file(&path, None).unwrap();
    assert_eq!(doc.pages().len(), 2);
    assert!(doc.pages().get(1).unwrap().text().unwrap().all().contains("zwei"));
}

#[test]
fn blank_fixture_has_no_text() {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("blank.pdf");
    let engine = Engine::global(&default_library_dir()).unwrap();
    fixtures::write_blank_pdf(engine, &path, 3).unwrap();
    let doc = engine.pdfium().load_pdf_from_file(&path, None).unwrap();
    assert_eq!(doc.pages().len(), 3);
    assert_eq!(doc.pages().get(0).unwrap().text().unwrap().all().trim(), "");
}
