use std::path::{Path, PathBuf};
use std::sync::OnceLock;

use pdfium_render::prelude::Pdfium;

use crate::error::CoreError;

/// The one PDFium instance of the process. PDFium itself is single-threaded;
/// pdfium-render (feature `thread_safe`, on by default) serialises every call
/// behind a mutex, so the engine and its documents may be shared between threads.
pub struct Engine {
    pdfium: Pdfium,
}

static ENGINE: OnceLock<Engine> = OnceLock::new();

impl std::fmt::Debug for Engine {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("Engine").finish_non_exhaustive()
    }
}

impl Engine {
    /// Binds the PDFium library found in `library_dir` (`pdfium.dll` / `libpdfium.dylib`).
    /// pdfium-render binds a process at most once; a second call with another
    /// directory reuses the first binding.
    pub fn load(library_dir: &Path) -> Result<Engine, CoreError> {
        let library = Pdfium::pdfium_platform_library_name_at_path(library_dir);
        let bindings = Pdfium::bind_to_library(&library).map_err(|source| CoreError::EngineLoad {
            path: library.clone(),
            source,
        })?;
        Ok(Engine {
            pdfium: Pdfium::new(bindings),
        })
    }

    /// The process-wide engine; loads it on first call, later calls ignore the path.
    pub fn global(library_dir: &Path) -> Result<&'static Engine, CoreError> {
        if let Some(engine) = ENGINE.get() {
            return Ok(engine);
        }
        let engine = Engine::load(library_dir)?;
        let _ = ENGINE.set(engine); // another thread may have won the race
        Ok(ENGINE.get().expect("engine set above"))
    }

    pub fn pdfium(&self) -> &Pdfium {
        &self.pdfium
    }
}

/// Directory of the PDFium library for tests and tools:
/// `PAGINAE_PDFIUM_DIR` if set, otherwise `<workspace>/resources/pdfium/<platform>`.
pub fn default_library_dir() -> PathBuf {
    if let Ok(dir) = std::env::var("PAGINAE_PDFIUM_DIR") {
        return PathBuf::from(dir);
    }
    let workspace = Path::new(env!("CARGO_MANIFEST_DIR"))
        .ancestors()
        .nth(2)
        .expect("crates/<name> lives two levels below the workspace root");
    workspace.join("resources").join("pdfium").join(platform_dir())
}

/// Sub-directory name of the bundled PDFium build for the running platform.
pub fn platform_dir() -> &'static str {
    match (std::env::consts::OS, std::env::consts::ARCH) {
        ("windows", "x86_64") => "win-x64",
        ("macos", "aarch64") => "mac-arm64",
        ("linux", "x86_64") => "linux-x64",
        (os, arch) => panic!("no bundled PDFium build for {os}/{arch}"),
    }
}
