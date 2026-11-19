use paginae_core::{CoreError, Engine};
use std::path::Path;

#[test]
fn load_from_missing_directory_names_the_library_path() {
    let err = Engine::load(Path::new("Z:/paginae-gibt-es-nicht")).expect_err("must fail");
    assert_eq!(err.kind(), "engine_load");
    match err {
        CoreError::EngineLoad { path, .. } => assert!(
            path.ends_with("pdfium.dll")
                || path.ends_with("libpdfium.dylib")
                || path.ends_with("libpdfium.so"),
            "path was {path:?}"
        ),
        other => panic!("unexpected {other:?}"),
    }
}
