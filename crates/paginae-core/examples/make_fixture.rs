use paginae_core::{Engine, default_library_dir, fixtures};

fn main() {
    let out = std::env::args().nth(1).expect("usage: make_fixture <output.pdf>");
    let engine = Engine::global(&default_library_dir()).expect("PDFium engine");
    fixtures::write_text_pdf(
        engine,
        std::path::Path::new(&out),
        &[
            "Elternbrief: Klassenfahrt nach Echternach",
            "Seite zwei: Mitzubringen sind feste Schuhe und Regenjacke.",
            "Seite drei: Rueckmeldung bis zum 30. April.",
        ],
    )
    .expect("write fixture");
    println!("wrote {out}");
}
