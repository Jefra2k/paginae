---
tags: [projekt-notiz, nortic, programmieren, digitale-bildung]
status: entwurf
bereich: Beruf
kategorie: norTIC
erstellt: 2026-11-19
---

# Paginae Etappe 1 „Grundgerüst“: Umsetzungsplan

> **Für den Ausführenden:** PFLICHT-SKILL `superpowers:subagent-driven-development` (empfohlen) oder `superpowers:executing-plans`, Aufgabe für Aufgabe. Diese Vault-Fassung schreibt Schritte als Aufzählung (Vault-Regel: keine Aufgaben-Kästchen in Plan-Notizen). Aufgabe 1 legt die ausführbare Kopie unter `docs/superpowers/plans/2026-11-19-etappe-1-grundgeruest.md` im Repository ab und wandelt dort jeden Schritt in `- [ ]` um.

Gehört zu [[PDF-Werkstatt für Schulen]]. Übersicht der Etappen: [[2026-11-19 Plan Paginae Bauabschnitt 1 Übersicht]].

**Ziel:** Ein installierbares Paginae für Windows und Mac, das PDFs öffnet, anzeigt, blättert, zoomt, durchsucht, Lesezeichen zeigt und druckt, in der Grundaufteilung „Werkbank“, zweisprachig, mit Protokolldatei, mit Prüfständen in GitHub Actions und einem öffentlichen Repository.

**Architektur:** Rust-Workspace mit zwei Teilen. `crates/paginae-core` hält alles, was ein PDF berührt (PDFium über `pdfium-render`), kennt kein Tauri und wird mit selbst erzeugten Prüf-PDFs getestet. `src-tauri` ist die dünne Hülle: Befehle, Zustand, Protokoll, Ressourcen. Die Oberfläche (React, TypeScript, Vite) spricht nur über eine `Backend`-Schnittstelle mit der Hülle; dieselbe Schnittstelle hat eine Fake-Ausprägung, gegen die alle Browser-Tests laufen. Koordinaten: der Kern liefert PDF-Punkte (Ursprung unten links), die Oberfläche rechnet in CSS-Pixel um (Ursprung oben links); diese Umrechnung sitzt an genau einer Stelle (`geometry.ts`).

**Technik:** Rust 1.96 (edition 2024), Tauri 2.12 (`tauri` 2.12.7, `@tauri-apps/cli` 2.12.6), `pdfium-render` 0.9.5 mit PDFium chromium/8165 aus `bblanchon/pdfium-binaries`, `image` 0.25, `thiserror` 2, `log` 0.4, Tauri-Plugins `dialog`, `log`, `store` (alle 2.x); Node 24, React 19, Vite 8, Vitest 5, `@testing-library/react` 16, `jsdom` 31, `i18next` 27, `react-i18next` 18, `lucide-react` 1.76 (ISC); Ende-zu-Ende `@wdio/cli` 10 mit `@wdio/tauri-service` 1.5, `tauri-plugin-wdio-webdriver` 1.5 (nur Mac, nur Feature `e2e`); Prüfläufe `cargo-deny` 0.22, `license-checker-rseidelsohn` 5. Alle Versionen am 2026-11-19 gegen crates.io und npm geprüft.

**Spec:** [[2026-11-19 Design PDF-Werkstatt für Schulen]] (freigegeben 2026-11-19) samt Bildschirmentwürfen `2026-11-19 Bildschirmentwuerfe Paginae.html` (Variante A). Aufgabe 1 kopiert beide als `docs/design/2026-11-19-design.md` und `docs/design/2026-11-19-bildschirmentwuerfe.html` ins Repository, damit Plan und Spec zusammen reisen.

**Vorab-Probe (2026-11-19):** Kern und Hülle dieses Plans wurden im Scratchpad gebaut und geprüft: 8 Rust-Tests grün, `cargo build` der Hülle in 1 min 31 s, `tauri dev` öffnet ein Prüf-PDF und rendert Seite 1 bei 900 px Breite in 156 ms (Debug-Bau). Der Code der Aufgaben 2 bis 4 ist dieser geprüfte Stand. `tauri-build` kopiert die Ressourcen auch im Entwicklungsmodus nach `target/debug/pdfium/`, der Entwicklungs-Rückfallpfad greift also nur bei untypischen Aufbauten.

## Globale Randbedingungen

- Repository `C:\Projekte\paginae`, GitHub `Jefra2k/paginae`, **öffentlich ab dem ersten Push** (Beschluss Jerome 2026-11-19). README trägt oben den Hinweis „In development, not yet for use“.
- Lizenz des Codes: MIT, Copyright 2026 Jerome Franzen. Abhängigkeiten nur MIT, Apache-2.0, BSD-2/3, ISC, MPL-2.0, Zlib, 0BSD, CC0-1.0, BSL-1.0, Unicode-3.0; LGPL nur dynamisch gebunden; keine AGPL, kein Stirling-Code. Schriften SIL OFL, Symbole ISC/MIT/CC-BY. Jeder neue Baustein steht mit Lizenz in `docs/THIRD-PARTY.md`.
- Kein Netz: Die App öffnet in dieser Etappe keine einzige Netzverbindung. Der Prüflauf `scripts/check-network-deps.mjs` (Aufgabe 9) hält das fest.
- Bundle-Kennung `lu.paginae.app` (Entscheidung Claude; nur intern sichtbar, z. B. im Protokollpfad `%LOCALAPPDATA%\lu.paginae.app\logs`). Produktname `Paginae`, Binärname `paginae`.
- Oberfläche Deutsch (Voreinstellung) und Französisch; jeder sichtbare Text kommt aus `src/i18n/de.json` und `src/i18n/fr.json`; der Test `src/i18n/catalogs.test.ts` scheitert bei fehlenden oder leeren Schlüsseln. Entwickler-Dokumentation Englisch. Bezeichner im Code Englisch.
- Nichts imitiert Acrobat: keine Adobe-Symbole, -Farben oder -Wortlaute. Grundaufteilung Variante A (Reiter oben, Arbeitsweisen darunter, Seitenübersicht links, Dokument Mitte, Werkzeugbereich rechts, beide Seitenbereiche einklappbar).
- Zielsysteme: Windows 10/11 x64, macOS 12+ auf Apple Silicon (`bundle.macOS.minimumSystemVersion` = `"12.0"`, Anpassung nach Prüfung des Mac mini). Windows-Installer NSIS je Benutzer, keine Adminrechte.
- Git: Branch `main`, `.gitattributes` mit `* text=auto eol=lf`, Commit-Betreff Englisch nach Conventional Commits (`feat:`, `test:`, `chore:`, `docs:`, `ci:`), jede Commit-Nachricht endet mit `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`. Push nach `origin main` nach jeder Aufgabe (Entwurfs-Repo innerhalb des freigegebenen Plans).
- Rust: `cargo clippy --workspace --all-targets -- -D warnings` und `cargo fmt --check` müssen vor jedem Commit bestehen. TypeScript: `tsc --noEmit` und `vitest run` ebenso.
- PDFium-Binärdateien werden nicht eingecheckt, sondern per `scripts/fetch-pdfium.mjs` mit fester Version und SHA-256 geladen (Windows x64 `ca7338ae7779b8b1b82f4580305c4d762d214f8df1d54b47647fe3cc75989ded`, macOS arm64 `112e74d717f3e0310273b70f3c8780e8a61ff11b34834124465c8305c841d350`, Release `chromium/8165`, 2026-11-16).
- Keine fremden Dokumente als Prüfdateien: alle Prüf-PDFs erzeugt `paginae_core::fixtures` mit PDFium selbst.
- Im Vault gibt es kein Git; alle Commits betreffen nur `C:\Projekte\paginae`.

## Prüfschwerpunkte (Review Focus)

Fünf Eingaben, die die Spec nicht nennt, die aber Lehrkräfte treffen; jede hat ihren Test in der zuständigen Aufgabe:

1. **Riesige Seiten** (A0-Pläne, Scans mit 600 dpi): Eine Render-Anfrage darf keinen Speicherfehler auslösen. `render_png` begrenzt die Zielbreite auf 8000 px (`clamp_render_width`, Aufgabe 3).
2. **Pfade mit Akzenten, Umlauten und OneDrive-Ordnern** (`C:\Users\…\OneDrive - 365education\Élève ü.pdf`): Öffnen und Anzeige des Dateinamens funktionieren (Aufgabe 3, Test mit Fixture `Élève ü.pdf`).
3. **Doppeltes Öffnen beim Start** (React StrictMode führt Effekte zweimal aus; in der Vorab-Probe wurde die Startdatei zweimal geöffnet): Die Startdatei wird genau einmal geöffnet (Aufgabe 6, Test unter `<StrictMode>`).
4. **Zwei Dokumente offen, aktives wird geschlossen**: der Nachbarreiter wird aktiv, Render-Anfragen des geschlossenen Dokuments verfallen ohne Fehler (Aufgabe 6).
5. **Gescanntes PDF ohne Textschicht**: Die Suche findet nichts und sagt warum („Diese Datei enthält keinen durchsuchbaren Text. Texterkennung folgt in Bauabschnitt 2.“), statt leer zu bleiben (Aufgabe 7, `has_text`).

Noch nicht in Etappe 1 prüfbar, in der Übersicht vermerkt: passwortgeschützte PDFs (Prüf-PDF entsteht erst mit `lopdf` in Etappe 2; der Dialogpfad ist in Aufgabe 6 gegen den Fake gebaut), XFA-Formulare (echtes Prüfdokument fehlt), Mac-Druckdialog (Jeromes Handtest).

---

## Task 1: Repository und Gerüst

**Dateien:**
- Erzeugt durch `create-tauri-app`: `index.html`, `package.json`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `src/`, `src-tauri/` (Vorlage `react-ts`, Paketmanager npm)
- Erstellen: `Cargo.toml` (Workspace), `LICENSE`, `README.md`, `.gitignore`, `.gitattributes`, `rustfmt.toml`, `scripts/fetch-pdfium.mjs`, `resources/pdfium/.gitkeep`, `crates/paginae-core/Cargo.toml`, `crates/paginae-core/src/lib.rs` (leer), `src-tauri/tauri.windows.conf.json`, `src-tauri/tauri.macos.conf.json`, `docs/THIRD-PARTY.md`, `docs/design/…` (Kopien), `docs/superpowers/plans/2026-11-19-etappe-1-grundgeruest.md`
- Ändern: `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`, `src-tauri/capabilities/default.json`, `package.json`

**Schnittstellen:**
- Liefert: Workspace mit Mitgliedern `crates/paginae-core` und `src-tauri`; `npm run fetch:pdfium` legt `resources/pdfium/<platform>/` ab; `resources/pdfium/VERSION`, `resources/pdfium/LICENSE-pdfium-binaries.txt`, `resources/pdfium/licenses/pdfium.txt`.

Schritte:

- [ ] **Schritt 1:** Gerüst erzeugen.
  ```powershell
  cd C:\Projekte; npm create tauri-app@latest paginae -- --template react-ts --manager npm --yes; cd paginae; git init -b main
  ```
  Erwartet: Ordner `C:\Projekte\paginae` mit `src-tauri/`, `src/`, `package.json`.

- [ ] **Schritt 2:** `Cargo.toml` im Wurzelverzeichnis schreiben:
  ```toml
  [workspace]
  resolver = "2"
  members = ["crates/paginae-core", "src-tauri"]

  [workspace.package]
  edition = "2024"
  license = "MIT"

  [profile.release]
  codegen-units = 1
  lto = true
  opt-level = 3
  panic = "abort"
  strip = true
  ```
  Dazu `crates/paginae-core/Cargo.toml`:
  ```toml
  [package]
  name = "paginae-core"
  version = "0.1.0"
  edition = "2024"
  license = "MIT"
  description = "PDF core of Paginae (PDFium via pdfium-render), independent of the desktop shell"

  [dependencies]
  pdfium-render = "0.9.5"
  image = { version = "0.25", default-features = false, features = ["png"] }
  thiserror = "2"
  serde = { version = "1", features = ["derive"] }

  [dev-dependencies]
  tempfile = "3"
  ```
  und `crates/paginae-core/src/lib.rs` mit der Zeile `//! paginae-core: the PDF logic of Paginae (filled in Task 2).`

- [ ] **Schritt 3:** `src-tauri/Cargo.toml` ersetzen (der Abschnitt `[profile.release]` der Vorlage entfällt, er liegt jetzt im Workspace):
  ```toml
  [package]
  name = "paginae"
  version = "0.1.0"
  description = "Paginae: PDF tool for schools"
  authors = ["Jerome Franzen"]
  edition = "2024"
  license = "MIT"

  [lib]
  name = "paginae_lib"
  crate-type = ["staticlib", "cdylib", "rlib"]

  [build-dependencies]
  tauri-build = { version = "2", features = [] }

  [dependencies]
  paginae-core = { path = "../crates/paginae-core" }
  tauri = { version = "2", features = [] }
  tauri-plugin-dialog = "2"
  tauri-plugin-log = "2"
  tauri-plugin-store = "2"
  log = "0.4"
  serde = { version = "1", features = ["derive"] }
  serde_json = "1"

  [features]
  # Embedded WebDriver for end-to-end tests on macOS (Task 9). Never on by default.
  e2e = ["dep:tauri-plugin-wdio-webdriver"]

  [dependencies.tauri-plugin-wdio-webdriver]
  version = "1.5"
  optional = true
  ```

- [ ] **Schritt 4:** `src-tauri/tauri.conf.json` ersetzen:
  ```json
  {
    "$schema": "https://schema.tauri.app/config/2",
    "productName": "Paginae",
    "version": "0.1.0",
    "identifier": "lu.paginae.app",
    "build": {
      "beforeDevCommand": "npm run dev",
      "devUrl": "http://localhost:1420",
      "beforeBuildCommand": "npm run build",
      "frontendDist": "../dist"
    },
    "app": {
      "windows": [
        {
          "title": "Paginae",
          "width": 1280,
          "height": 800,
          "minWidth": 900,
          "minHeight": 600,
          "dragDropEnabled": true
        }
      ],
      "security": {
        "csp": "default-src 'self'; img-src 'self' blob: data:; style-src 'self' 'unsafe-inline'"
      }
    },
    "bundle": {
      "active": true,
      "targets": ["nsis", "dmg"],
      "createUpdaterArtifacts": false,
      "icon": ["icons/32x32.png", "icons/128x128.png", "icons/128x128@2x.png", "icons/icon.icns", "icons/icon.ico"],
      "resources": {
        "../resources/pdfium/LICENSE-pdfium-binaries.txt": "pdfium/LICENSE-pdfium-binaries.txt",
        "../resources/pdfium/licenses/pdfium.txt": "pdfium/LICENSE-pdfium.txt"
      },
      "windows": {
        "nsis": {
          "installMode": "currentUser",
          "languages": ["German", "French", "English"],
          "displayLanguageSelector": true
        }
      },
      "macOS": {
        "minimumSystemVersion": "12.0"
      }
    }
  }
  ```
  `src-tauri/tauri.windows.conf.json` (Plattformdateien ersetzen die Liste `resources` als Ganzes, darum stehen die Lizenzdateien hier noch einmal):
  ```json
  {
    "bundle": {
      "resources": {
        "../resources/pdfium/win-x64/pdfium.dll": "pdfium/pdfium.dll",
        "../resources/pdfium/LICENSE-pdfium-binaries.txt": "pdfium/LICENSE-pdfium-binaries.txt",
        "../resources/pdfium/licenses/pdfium.txt": "pdfium/LICENSE-pdfium.txt"
      }
    }
  }
  ```
  `src-tauri/tauri.macos.conf.json` gleich, mit `"../resources/pdfium/mac-arm64/libpdfium.dylib": "pdfium/libpdfium.dylib"` statt der DLL-Zeile.
  `src-tauri/capabilities/default.json`: `permissions` = `["core:default", "dialog:default", "log:default", "store:default"]`.

- [ ] **Schritt 5:** `scripts/fetch-pdfium.mjs` schreiben (Node, keine Abhängigkeiten):
  ```js
  #!/usr/bin/env node
  // Downloads the pinned PDFium build for this platform (or --all) into resources/pdfium/.
  import { createHash } from "node:crypto";
  import { mkdirSync, existsSync, readFileSync, writeFileSync, rmSync, cpSync } from "node:fs";
  import { tmpdir } from "node:os";
  import { join, dirname } from "node:path";
  import { fileURLToPath } from "node:url";
  import { execFileSync } from "node:child_process";

  export const RELEASE = "chromium/8165";
  export const BUILDS = {
    "win-x64": { asset: "pdfium-win-x64.tgz", lib: "bin/pdfium.dll",
      sha256: "ca7338ae7779b8b1b82f4580305c4d762d214f8df1d54b47647fe3cc75989ded" },
    "mac-arm64": { asset: "pdfium-mac-arm64.tgz", lib: "lib/libpdfium.dylib",
      sha256: "112e74d717f3e0310273b70f3c8780e8a61ff11b34834124465c8305c841d350" },
  };

  export function currentPlatform() {
    const key = `${process.platform}-${process.arch}`;
    return { "win32-x64": "win-x64", "darwin-arm64": "mac-arm64" }[key]
      ?? (() => { throw new Error(`no PDFium build for ${key}`); })();
  }

  export async function fetchBuild(platform, root) {
    const build = BUILDS[platform];
    const target = join(root, "resources", "pdfium", platform);
    const libPath = join(target, build.lib.split("/").pop());
    if (existsSync(libPath)) { console.log(`${platform}: present`); return libPath; }
    const url = `https://github.com/bblanchon/pdfium-binaries/releases/download/${encodeURIComponent(RELEASE)}/${build.asset}`;
    const bytes = Buffer.from(await (await fetch(url)).arrayBuffer());
    const sha = createHash("sha256").update(bytes).digest("hex");
    if (sha !== build.sha256) throw new Error(`${build.asset}: checksum ${sha} differs from pinned ${build.sha256}`);
    const work = join(tmpdir(), `pdfium-${platform}-${Date.now()}`);
    mkdirSync(work, { recursive: true });
    writeFileSync(join(work, build.asset), bytes);
    execFileSync("tar", ["-xzf", join(work, build.asset), "-C", work]);
    mkdirSync(target, { recursive: true });
    cpSync(join(work, build.lib), libPath);
    cpSync(join(work, "LICENSE"), join(root, "resources", "pdfium", "LICENSE-pdfium-binaries.txt"));
    cpSync(join(work, "VERSION"), join(root, "resources", "pdfium", "VERSION"));
    cpSync(join(work, "licenses"), join(root, "resources", "pdfium", "licenses"), { recursive: true });
    rmSync(work, { recursive: true, force: true });
    console.log(`${platform}: fetched ${build.asset} (${bytes.length} bytes, sha256 ok)`);
    return libPath;
  }

  if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const root = join(dirname(fileURLToPath(import.meta.url)), "..");
    const platforms = process.argv.includes("--all") ? Object.keys(BUILDS) : [currentPlatform()];
    for (const p of platforms) await fetchBuild(p, root);
  }
  ```
  `package.json` → `scripts` ergänzen: `"fetch:pdfium": "node scripts/fetch-pdfium.mjs"`, `"test": "vitest run"`, `"check:i18n": "vitest run src/i18n"`, `"check:licenses": "node scripts/check-licenses.mjs"`, `"check:network": "node scripts/check-network-deps.mjs"`, `"e2e": "wdio run wdio.conf.ts"` (die Skripte dazu entstehen in Aufgabe 5 und 9; bis dahin dürfen die Einträge fehlschlagen, sie werden in Aufgabe 9 geprüft).

- [ ] **Schritt 6:** Laufen lassen: `npm run fetch:pdfium`. Erwartet: Ausgabe `win-x64: fetched pdfium-win-x64.tgz (… bytes, sha256 ok)` und Dateien `resources/pdfium/win-x64/pdfium.dll` (7 846 912 Bytes), `resources/pdfium/VERSION` mit `BUILD=8165`, `resources/pdfium/licenses/pdfium.txt`. Zweiter Lauf: `win-x64: present`.

- [ ] **Schritt 7:** `.gitignore` (Vorlage ergänzen): `node_modules/`, `dist/`, `target/`, `resources/pdfium/*/`, `resources/pdfium/licenses/`, `resources/pdfium/VERSION`, `resources/pdfium/LICENSE-pdfium-binaries.txt`, `src-tauri/gen/schemas/`, `src-tauri/capabilities/e2e.json`, `e2e/.tmp/`. `.gitattributes`: `* text=auto eol=lf`. `rustfmt.toml`: `edition = "2024"`, `max_width = 110`. `LICENSE`: MIT-Text mit „Copyright (c) 2026 Jerome Franzen“. `README.md` (Englisch): Titel, Satz „Paginae is a free, open-source PDF tool for teachers and school staff (Windows and macOS). **Status: in development, not yet for use.**“, Abschnitte Build (`npm ci`, `npm run fetch:pdfium`, `npm run tauri dev`), Tests (`cargo test --workspace`, `npm test`), Structure (drei Zeilen zu `crates/paginae-core`, `src-tauri`, `src`), License. `docs/THIRD-PARTY.md`: Tabelle mit den Spalten Component | Version | License | Use, erste Zeilen PDFium (chromium/8165, BSD-3-Clause), pdfium-binaries (MIT), pdfium-render (MIT/Apache-2.0), Tauri (MIT/Apache-2.0), React (MIT), Lucide (ISC).

- [ ] **Schritt 8:** Spec und Plan kopieren: Design-Notiz nach `docs/design/2026-11-19-design.md`, Bildschirmentwürfe nach `docs/design/2026-11-19-bildschirmentwuerfe.html`, diesen Plan nach `docs/superpowers/plans/2026-11-19-etappe-1-grundgeruest.md`, dort jeden „- Schritt N:“ in „- [ ] **Schritt N:**“ wandeln.

- [ ] **Schritt 9:** Bauen: `npm install`, dann `cargo build --workspace` (erster Bau 2 bis 4 Minuten) und `npm run build`. Erwartet: beide ohne Fehler; Warnung „profiles for the non root package will be ignored“ darf nicht mehr erscheinen.

- [ ] **Schritt 10:** Commit und Repository anlegen:
  ```powershell
  git add -A; git commit -m "chore: scaffold Paginae workspace (Tauri 2, React, paginae-core, PDFium fetch script)"
  gh repo create Jefra2k/paginae --public --source . --push --description "Paginae: free PDF tool for schools (Windows, macOS). In development."
  ```
  Erwartet: `https://github.com/Jefra2k/paginae` erreichbar, Branch `main`.

## Task 2: Kern: Motor, Fehler, Prüf-PDFs

**Dateien:**
- Erstellen: `crates/paginae-core/src/error.rs`, `crates/paginae-core/src/engine.rs`, `crates/paginae-core/src/fixtures.rs`, `crates/paginae-core/examples/make_fixture.rs`, `crates/paginae-core/tests/engine.rs`, `crates/paginae-core/tests/engine_error.rs`
- Ändern: `crates/paginae-core/src/lib.rs`

**Schnittstellen:**
- Liefert: `Engine::load(library_dir: &Path) -> Result<Engine, CoreError>`, `Engine::global(library_dir: &Path) -> Result<&'static Engine, CoreError>`, `Engine::pdfium(&self) -> &Pdfium`, `default_library_dir() -> PathBuf`, `platform_dir() -> &'static str`, `CoreError` mit `kind(&self) -> &'static str`, `fixtures::write_text_pdf(engine, path, pages: &[&str]) -> Result<(), CoreError>`, `fixtures::write_blank_pdf(engine, path, pages: u32) -> Result<(), CoreError>`.

Schritte:

- [ ] **Schritt 1:** Tests schreiben. `tests/engine_error.rs` (eigene Datei, weil ein Prozess PDFium nur einmal bindet und der Fehlerfall vor dem Erfolgsfall laufen muss):
  ```rust
  use std::path::Path;
  use paginae_core::{CoreError, Engine};

  #[test]
  fn load_from_missing_directory_names_the_library_path() {
      let err = Engine::load(Path::new("Z:/paginae-gibt-es-nicht")).expect_err("must fail");
      assert_eq!(err.kind(), "engine_load");
      match err {
          CoreError::EngineLoad { path, .. } => assert!(
              path.ends_with("pdfium.dll") || path.ends_with("libpdfium.dylib") || path.ends_with("libpdfium.so"),
              "path was {path:?}"
          ),
          other => panic!("unexpected {other:?}"),
      }
  }
  ```
  `tests/engine.rs`:
  ```rust
  use paginae_core::{default_library_dir, fixtures, Engine};

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
  ```

- [ ] **Schritt 2:** `cargo test -p paginae-core` → Erwartet: Kompilierfehler (unbekannte Typen).

- [ ] **Schritt 3:** `src/error.rs` (geprüfter Stand der Vorab-Probe):
  ```rust
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
      pub(crate) fn from_load(err: PdfiumError, had_password: bool) -> CoreError {
          match err {
              PdfiumError::PdfiumLibraryInternalError(PdfiumInternalError::PasswordError) => {
                  if had_password { CoreError::WrongPassword } else { CoreError::PasswordRequired }
              }
              PdfiumError::PdfiumLibraryInternalError(PdfiumInternalError::FormatError) => CoreError::InvalidFormat,
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
  ```

- [ ] **Schritt 4:** `src/engine.rs`:
  ```rust
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

  impl Engine {
      /// Binds the PDFium library found in `library_dir` (`pdfium.dll` / `libpdfium.dylib`).
      /// pdfium-render binds a process at most once; a second call with another
      /// directory reuses the first binding.
      pub fn load(library_dir: &Path) -> Result<Engine, CoreError> {
          let library = Pdfium::pdfium_platform_library_name_at_path(library_dir);
          let bindings = Pdfium::bind_to_library(&library)
              .map_err(|source| CoreError::EngineLoad { path: library.clone(), source })?;
          Ok(Engine { pdfium: Pdfium::new(bindings) })
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
  ```

- [ ] **Schritt 5:** `src/fixtures.rs`:
  ```rust
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
  ```
  `src/lib.rs`:
  ```rust
  //! paginae-core: the PDF logic of Paginae, independent of the desktop shell.
  //!
  //! The shell (`src-tauri`) only translates commands into calls on
  //! [`Workspace`]; everything that touches a PDF lives here and is tested here
  //! with fixture PDFs generated by [`fixtures`].

  pub mod engine;
  pub mod error;
  pub mod fixtures;

  pub use engine::{default_library_dir, platform_dir, Engine};
  pub use error::CoreError;
  ```
  `examples/make_fixture.rs`: liest `args().nth(1)` als Ausgabepfad, lädt `Engine::global(&default_library_dir())`, schreibt per `write_text_pdf` drei Seiten („Elternbrief: Klassenfahrt nach Echternach“, „Seite zwei: Mitzubringen sind feste Schuhe und Regenjacke.“, „Seite drei: Rueckmeldung bis zum 30. April.“), gibt `wrote <pfad>` aus.

- [ ] **Schritt 6:** `cargo test -p paginae-core` → Erwartet: 4 Tests grün (`engine_error` 1, `engine` 3). `cargo run -p paginae-core --example make_fixture -- fixture.pdf` → Datei entsteht; danach löschen.

- [ ] **Schritt 7:** `cargo fmt --all && cargo clippy --workspace --all-targets -- -D warnings`, dann Commit `feat(core): PDFium engine, error model and fixture generator`.

## Task 3: Kern: Arbeitsbereich mit Öffnen, Rendern, Suchen, Lesezeichen

**Dateien:**
- Erstellen: `crates/paginae-core/src/document.rs`, `crates/paginae-core/tests/workspace.rs`
- Ändern: `crates/paginae-core/src/lib.rs`

**Schnittstellen:**
- Nutzt: `Engine`, `CoreError`, `fixtures` aus Aufgabe 2.
- Liefert (alle `serde::Serialize`, an die Oberfläche 1:1 als JSON): `DocId = u32`; `DocumentInfo { id, path: String, file_name: String, title: Option<String>, page_count: u32, pages: Vec<PageInfo>, form: FormKind, permissions: Permissions, encrypted: bool }`; `PageInfo { index: u32, width_pt: f32, height_pt: f32, rotation: u16 }` (Größe nach Drehung, also wie angezeigt); `FormKind::{None, AcroForm, Xfa}` als `"none" | "acro_form" | "xfa"`; `Permissions { print, modify, copy, annotate, fill_forms, assemble: bool }` mit `Permissions::ALL`; `RectPt { left, bottom, right, top: f32 }` (PDF-Punkte, Ursprung unten links); `SearchHit { page_index: u32, rects: Vec<RectPt> }`; `Bookmark { title: String, page_index: Option<u32>, children: Vec<Bookmark> }`.
- `Workspace::new(engine: &'static Engine)`, `open(&self, path: &Path, password: Option<&str>) -> Result<DocumentInfo>`, `close(&self, id) -> Result<()>`, `open_ids(&self) -> Vec<DocId>`, `info(&self, id) -> Result<DocumentInfo>`, `render_png(&self, id, page_index: u32, target_width_px: u32) -> Result<Vec<u8>>`, `page_text(&self, id, page_index) -> Result<String>`, `has_text(&self, id) -> Result<bool>`, `search(&self, id, query: &str) -> Result<Vec<SearchHit>>`, `bookmarks(&self, id) -> Result<Vec<Bookmark>>`, `pub const MAX_RENDER_WIDTH_PX: u32 = 8000`, `pub fn clamp_render_width(requested: u32) -> i32`.

Schritte:

- [ ] **Schritt 1:** `tests/workspace.rs` schreiben (Helfer `engine()` und `fixture(name, pages) -> (TempDir, PathBuf)` wie in Aufgabe 2):
  ```rust
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
      assert!(inked > 200, "24 glyphs at 14 pt should ink more than 200 pixels, found {inked}");
      let top_left = img.enumerate_pixels().filter(|(x, y, p)| *x < 300 && *y < 212 && !is_white(p)).count();
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
      assert!(matches!(ws.render_png(id, 1, 100), Err(CoreError::PageOutOfRange(1))));
      assert!(matches!(ws.render_png(99, 0, 100), Err(CoreError::UnknownDocument(99))));
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
      assert!(r.left >= 72.0 && r.top <= 790.0, "rect near the text position: {r:?}");
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
      assert!(matches!(ws.open(&dir.path().join("fehlt.pdf"), None), Err(CoreError::Io(_))));
      let empty = dir.path().join("leer.pdf");
      std::fs::write(&empty, b"").unwrap();
      assert!(matches!(ws.open(&empty, None), Err(CoreError::InvalidFormat)));
      let fake = dir.path().join("kein.pdf");
      std::fs::write(&fake, b"Das ist kein PDF").unwrap();
      assert!(matches!(ws.open(&fake, None), Err(CoreError::InvalidFormat)));
  }
  ```

- [ ] **Schritt 2:** `cargo test -p paginae-core --test workspace` → Erwartet: Kompilierfehler.

- [ ] **Schritt 3:** `src/document.rs` schreiben. Geprüfter Stand der Vorab-Probe, ergänzt um `has_text`, `MAX_RENDER_WIDTH_PX` und `clamp_render_width`:
  ```rust
  use std::collections::HashMap;
  use std::io::Cursor;
  use std::path::{Path, PathBuf};
  use std::sync::atomic::{AtomicU32, Ordering};
  use std::sync::Mutex;

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
      pub const ALL: Permissions =
          Permissions { print: true, modify: true, copy: true, annotate: true, fill_forms: true, assemble: true };
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
          RectPt { left: r.left().value, bottom: r.bottom().value, right: r.right().value, top: r.top().value }
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
          Workspace { engine, docs: Mutex::new(HashMap::new()), next_id: AtomicU32::new(1) }
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
          let doc = OpenDocument { path: path.to_path_buf(), pdf, encrypted: password.is_some() };
          let info = describe(id, &doc)?;
          self.docs.lock().expect("workspace lock").insert(id, doc);
          Ok(info)
      }

      pub fn close(&self, id: DocId) -> Result<(), CoreError> {
          self.docs.lock().expect("workspace lock").remove(&id).map(|_| ()).ok_or(CoreError::UnknownDocument(id))
      }

      pub fn open_ids(&self) -> Vec<DocId> {
          let mut ids: Vec<DocId> = self.docs.lock().expect("workspace lock").keys().copied().collect();
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
              let mut png = Cursor::new(Vec::new());
              image
                  .into_rgba8()
                  .write_to(&mut png, image::ImageFormat::Png)
                  .map_err(|e| CoreError::Engine(format!("PNG encoding failed: {e}")))?;
              Ok(png.into_inner())
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
                      hits.push(SearchHit { page_index: index as u32, rects });
                  }
              }
              Ok(hits)
          })
      }

      pub fn bookmarks(&self, id: DocId) -> Result<Vec<Bookmark>, CoreError> {
          self.with_doc(id, |doc| {
              let mut out = Vec::new();
              let mut current = doc.pdf.bookmarks().root();
              while let Some(b) = current {
                  out.push(bookmark_tree(&b));
                  current = b.next_sibling();
              }
              Ok(out)
          })
      }

      fn with_doc<T>(&self, id: DocId, f: impl FnOnce(&OpenDocument) -> Result<T, CoreError>) -> Result<T, CoreError> {
          let docs = self.docs.lock().expect("workspace lock");
          let doc = docs.get(&id).ok_or(CoreError::UnknownDocument(id))?;
          f(doc)
      }
  }

  fn bookmark_tree(bookmark: &PdfBookmark<'_>) -> Bookmark {
      let mut children = Vec::new();
      let mut child = bookmark.first_child();
      while let Some(c) = child {
          children.push(bookmark_tree(&c));
          child = c.next_sibling();
      }
      Bookmark {
          title: bookmark.title().unwrap_or_default(),
          page_index: bookmark.destination().and_then(|d| d.page_index().ok()).map(|i| i as u32),
          children,
      }
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
          // PDFium reports the unrotated media box; swap for 90/270 so the UI sees the displayed size.
          let (width_pt, height_pt) = if rotation == 90 || rotation == 270 { (h, w) } else { (w, h) };
          pages.push(PageInfo { index: index as u32, width_pt, height_pt, rotation });
      }
      let form = match pdf.form().map(|f| f.form_type()) {
          None | Some(PdfFormType::None) => FormKind::None,
          Some(PdfFormType::Acrobat) => FormKind::AcroForm,
          Some(PdfFormType::XfaFull) | Some(PdfFormType::XfaForeground) => FormKind::Xfa,
      };
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
          file_name: doc.path.file_name().map(|n| n.to_string_lossy().into_owned()).unwrap_or_default(),
          title,
          page_count: pages.len() as u32,
          pages,
          form,
          permissions,
          encrypted: doc.encrypted,
      })
  }
  ```
  In `lib.rs`: `pub mod document;` und `pub use document::{clamp_render_width, Bookmark, DocId, DocumentInfo, FormKind, PageInfo, Permissions, RectPt, SearchHit, Workspace, MAX_RENDER_WIDTH_PX};`.

- [ ] **Schritt 4:** `cargo test -p paginae-core` → Erwartet: alle Tests grün (4 aus Aufgabe 2, 11 aus `workspace.rs`). Falls `open_reports_missing_empty_and_non_pdf_files` für die leere Datei `Io` statt `InvalidFormat` meldet: das ist PDFiums Antwort, dann die Erwartung auf `Err(CoreError::InvalidFormat) | Err(CoreError::Io(_))` erweitern und im Commit nennen.

- [ ] **Schritt 5:** `cargo fmt --all && cargo clippy --workspace --all-targets -- -D warnings`; Commit `feat(core): workspace with open, render, search, bookmarks and has_text`.

## Task 4: Hülle: Tauri-Befehle, Zustand, Protokoll, Ressourcen

**Dateien:**
- Ändern: `src-tauri/src/lib.rs` (ersetzen), `src-tauri/src/main.rs` (bleibt wie Vorlage)

**Schnittstellen:**
- Nutzt: `Workspace`, `Engine`, `DocumentInfo`, `SearchHit`, `Bookmark`, `CoreError` aus Aufgabe 2 und 3.
- Liefert Befehle (Oberfläche ruft sie mit camelCase-Argumenten, Tauri wandelt in snake_case): `open_document(path: String, password: Option<String>) -> DocumentInfo`, `close_document(id)`, `document_info(id) -> DocumentInfo`, `render_page(id, page_index: u32, width_px: u32) -> ArrayBuffer (PNG)`, `search_document(id, query) -> Vec<SearchHit>`, `document_bookmarks(id) -> Vec<Bookmark>`, `document_has_text(id) -> bool`, `startup_file() -> Option<String>` (Umgebungsvariable `PAGINAE_OPEN`). Fehler kommen als `{ kind: string, message: string }` (`CommandError`).
- Protokolldatei: `%LOCALAPPDATA%\lu.paginae.app\logs\paginae.log` (Windows), `~/Library/Logs/lu.paginae.app/paginae.log` (macOS); Inhalt: Vorgänge mit Dauer, Fehler mit `kind`, nie Dokumentinhalte, Pfade nur als Dateiname.

Schritte:

- [ ] **Schritt 1:** `src-tauri/src/lib.rs` ersetzen (geprüfter Stand der Vorab-Probe plus `document_info`, `document_bookmarks`, `document_has_text`, Store-Plugin, Feature `e2e`):
  ```rust
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
          CommandError { kind: err.kind(), message: err.to_string() }
      }
  }

  pub struct AppState {
      pub workspace: Workspace,
  }

  fn file_name(path: &str) -> String {
      std::path::Path::new(path).file_name().map(|n| n.to_string_lossy().into_owned()).unwrap_or_default()
  }

  #[tauri::command]
  fn open_document(state: State<'_, AppState>, path: String, password: Option<String>) -> Result<DocumentInfo, CommandError> {
      let info = state.workspace.open(std::path::Path::new(&path), password.as_deref())?;
      log::info!("opened {} ({} pages, form {:?})", file_name(&path), info.page_count, info.form);
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
  fn render_page(state: State<'_, AppState>, id: DocId, page_index: u32, width_px: u32) -> Result<Response, CommandError> {
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
  fn search_document(state: State<'_, AppState>, id: DocId, query: String) -> Result<Vec<SearchHit>, CommandError> {
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
      let bundled = app.path().resolve("pdfium", BaseDirectory::Resource).unwrap_or_default();
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
      if cfg!(target_os = "windows") { "pdfium.dll" } else if cfg!(target_os = "macos") { "libpdfium.dylib" } else { "libpdfium.so" }
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
                      tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::LogDir { file_name: Some("paginae".to_string()) }),
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
              log::info!("Paginae {} starting, PDFium from {}", app.package_info().version, dir.display());
              let engine = Engine::global(&dir)?;
              app.manage(AppState { workspace: Workspace::new(engine) });
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
  ```
  Falls `RotationStrategy::KeepOne` in der installierten Plugin-Fassung anders heißt (Varianten laut Dokumentation `KeepAll`, `KeepOne`, `KeepSome(n)`), die vorhandene Variante nehmen, die genau eine Vorgängerdatei behält.

- [ ] **Schritt 2:** `cargo build -p paginae` → Erwartet: fehlerfrei (Vorab-Probe: 1 min 31 s). `cargo clippy --workspace --all-targets -- -D warnings` sauber.

- [ ] **Schritt 3:** Rauchtest von Hand (die Oberfläche kommt erst in Aufgabe 5, darum über eine provisorische `src/App.tsx`, die beim Start `startup_file` abfragt, `open_document` und `render_page` aufruft und das Bild zeigt; diese Datei wird in Aufgabe 5 ersetzt):
  ```powershell
  cargo run -p paginae-core --example make_fixture -- $env:TEMP\paginae-fixture.pdf
  $env:PAGINAE_OPEN = "$env:TEMP\paginae-fixture.pdf"; npm run tauri dev
  ```
  Erwartet: Fenster „Paginae“ zeigt Seite 1 mit „Elternbrief: Klassenfahrt nach Echternach“; in der Konsole die Zeilen `loading PDFium from …\target\debug\pdfium` und `rendered page 0 of document 1 at 900 px: … bytes in … ms` (Vorab-Probe: 156 ms); die Datei `%LOCALAPPDATA%\lu.paginae.app\logs\paginae.log` enthält dieselben Zeilen. Fenster schließen, `PAGINAE_OPEN` löschen.

- [ ] **Schritt 4:** Commit `feat(shell): Tauri commands, managed workspace, log file and PDFium resources`.

## Task 5: Oberfläche: Grundlage, Backend-Schnittstelle, Sprachen, Grundaufteilung A

**Dateien:**
- Erstellen: `src/backend/types.ts`, `src/backend/Backend.ts`, `src/backend/tauriBackend.ts`, `src/backend/fakeBackend.ts`, `src/backend/BackendContext.tsx`, `src/i18n/index.ts`, `src/i18n/de.json`, `src/i18n/fr.json`, `src/i18n/catalogs.test.ts`, `src/app/AppShell.tsx`, `src/app/TabsBar.tsx`, `src/app/ModesBar.tsx`, `src/app/SidePane.tsx`, `src/app/AppShell.test.tsx`, `src/styles/tokens.css`, `src/styles/app.css`, `src/test/setup.ts`, `vitest.config.ts`
- Ändern: `src/main.tsx`, `src/App.tsx`, `index.html` (`<html lang="de">`, Titel „Paginae“), `package.json` (devDependencies), `tsconfig.json` (`"types": ["vitest/globals"]` nicht nötig; Tests importieren aus `vitest`)
- Löschen: `src/App.css`, `src/assets/react.svg`, `public/vite.svg`, `public/tauri.svg`

**Schnittstellen:**
- Liefert `src/backend/types.ts`: TypeScript-Spiegel der Rust-Typen aus Aufgabe 3 (`DocumentInfo`, `PageInfo`, `FormKind = "none" | "acro_form" | "xfa"`, `Permissions`, `RectPt`, `SearchHit`, `Bookmark`, `CommandError { kind: string; message: string }`, `RecentFile { path: string; name: string; openedAt: string }`) und `isCommandError(e: unknown): e is CommandError`.
- `src/backend/Backend.ts`:
  ```ts
  export interface Backend {
    openDocument(path: string, password?: string): Promise<DocumentInfo>;
    documentInfo(id: number): Promise<DocumentInfo>;
    closeDocument(id: number): Promise<void>;
    renderPage(id: number, pageIndex: number, widthPx: number): Promise<Blob>;
    search(id: number, query: string): Promise<SearchHit[]>;
    bookmarks(id: number): Promise<Bookmark[]>;
    hasText(id: number): Promise<boolean>;
    startupFile(): Promise<string | null>;
    pickPdf(): Promise<string | null>;
    onFilesDropped(handler: (paths: string[]) => void): Promise<() => void>;
    loadRecentFiles(): Promise<RecentFile[]>;
    saveRecentFiles(files: RecentFile[]): Promise<void>;
    printDocument(id: number): Promise<void>;
    printWindowReady(): Promise<void>;
  }
  ```
  `tauriBackend.ts` setzt jede Methode mit `invoke` (Befehlsnamen aus Aufgabe 4: `openDocument` → `open_document`, `documentInfo` → `document_info`, `closeDocument` → `close_document`, `search` → `search_document`, `bookmarks` → `document_bookmarks`, `hasText` → `document_has_text`, `startupFile` → `startup_file`; `renderPage` = `new Blob([await invoke<ArrayBuffer>("render_page", { id, pageIndex, widthPx })], { type: "image/png" })`), `pickPdf` mit `open({ multiple: false, filters: [{ name: "PDF", extensions: ["pdf"] }] })` aus `@tauri-apps/plugin-dialog`, `onFilesDropped` mit `getCurrentWebview().onDragDropEvent(e => { if (e.payload.type === "drop") handler(e.payload.paths) })`, Recent-Dateien mit `load("recent.json", { autoSave: true })` aus `@tauri-apps/plugin-store`, Schlüssel `files`; `printDocument` ruft `invoke("print_document", { id })` und `printWindowReady` ruft `invoke("print_window_ready")` (beide Befehle kommen in Aufgabe 8; bis dahin sind die Methoden vorhanden, aber unbenutzt). Der Fake zählt beide in `calls` (`"print:1"`, `"print_ready"`).
  `fakeBackend.ts`: `export class FakeBackend implements Backend` mit Konstruktor `(fixtures: Record<string, Partial<DocumentInfo> & { password?: string; hits?: SearchHit[]; bookmarks?: Bookmark[]; hasText?: boolean }>)`, Zähler `calls: string[]` (z. B. `"open:/a.pdf"`, `"render:1:0:900"`, `"close:1"`), fortlaufende IDs ab 1, `openDocument` wirft `{ kind: "io", message }` für unbekannte Pfade, `{ kind: "password_required" }` wenn das Fixture ein Passwort hat und keines übergeben wurde, `{ kind: "wrong_password" }` bei falschem; `renderPage` liefert einen 1×1-PNG-Blob (fest kodierte 67 Bytes) nach `await Promise.resolve()`; `dropFiles(paths)` löst die registrierten Handler aus; `startupPath: string | null = null`; `recent: RecentFile[] = []`.
  `BackendContext.tsx`: `BackendProvider`, `useBackend()`.
- `src/i18n/index.ts`: `initI18n(language?: "de" | "fr")` (Voreinstellung: `navigator.language.startsWith("fr") ? "fr" : "de"`), i18next mit `resources: { de: { translation: de }, fr: { translation: fr } }`, `fallbackLng: "de"`, `interpolation.escapeValue: false`. Schlüssel (de.json, fr.json führt dieselben Schlüssel auf Französisch):
  ```json
  {
    "app": { "title": "Paginae" },
    "modes": { "read": "Lesen", "comment": "Kommentieren", "fill": "Ausfüllen", "pages": "Seiten", "tools": "Werkzeuge",
               "comingSoon": "Kommt in einem späteren Bauabschnitt" },
    "actions": { "open": "PDF öffnen", "close": "Schließen", "print": "Drucken", "undo": "Rückgängig", "redo": "Wiederholen",
                 "save": "Speichern", "cancel": "Abbrechen", "ok": "OK", "help": "Hilfe", "collapseLeft": "Seitenübersicht ausblenden",
                 "expandLeft": "Seitenübersicht einblenden", "collapseRight": "Werkzeugbereich ausblenden", "expandRight": "Werkzeugbereich einblenden" },
    "tabs": { "newTab": "Weitere Datei öffnen", "closeTab": "{{name}} schließen" },
    "start": { "headline": "Eine PDF-Datei öffnen", "hint": "Datei hierher ziehen oder öffnen.", "recent": "Zuletzt geöffnet", "noRecent": "Noch keine Dateien geöffnet." },
    "thumbnails": { "title": "Seiten", "page": "Seite {{n}}", "dropHint": "Datei hierher ziehen = Seiten anhängen (ab Etappe 2)" },
    "reader": { "zoom": "Zoom", "fitWidth": "Seitenbreite", "fitPage": "Ganze Seite", "zoomIn": "Vergrößern", "zoomOut": "Verkleinern",
                "pageOf": "Seite {{n}} von {{total}}", "prevPage": "Vorige Seite", "nextPage": "Nächste Seite",
                "search": "Suchen", "searchPlaceholder": "Im Dokument suchen", "hits_one": "{{count}} Treffer", "hits_other": "{{count}} Treffer",
                "noHits": "Nichts gefunden.", "noText": "Diese Datei enthält keinen durchsuchbaren Text. Texterkennung folgt in Bauabschnitt 2.",
                "nextHit": "Nächster Treffer", "prevHit": "Voriger Treffer", "bookmarks": "Lesezeichen", "noBookmarks": "Diese Datei hat keine Lesezeichen." },
    "password": { "title": "Passwort erforderlich", "text": "„{{name}}“ ist mit einem Passwort geschützt.", "label": "Passwort",
                  "wrong": "Das Passwort ist falsch. Bitte erneut versuchen.", "open": "Öffnen" },
    "banners": { "xfa": "Dieses Formular ist ein XFA-Formular. Paginae kann es anzeigen, aber nicht ausfüllen; dafür bitte den Acrobat Reader verwenden.",
                 "noPrint": "Der Ersteller dieser Datei hat das Drucken gesperrt." },
    "errors": { "io": "Die Datei konnte nicht gelesen werden.", "invalid_format": "Das ist keine lesbare PDF-Datei.",
                "engine_load": "Der PDF-Motor konnte nicht geladen werden. Bitte Paginae neu installieren.",
                "unknown_document": "Dieses Dokument ist nicht mehr geöffnet.", "page_out_of_range": "Diese Seite gibt es nicht.",
                "engine": "Beim Verarbeiten der PDF-Datei ist ein Fehler aufgetreten.", "unknown": "Unerwarteter Fehler: {{message}}" },
    "print": { "title": "Druckansicht", "preparing": "Seiten werden vorbereitet ({{done}} von {{total}})…", "ready": "Der Druckdialog öffnet sich." }
  }
  ```
  `catalogs.test.ts`: (a) `Object.keys(flatten(de))` gleich `Object.keys(flatten(fr))` (sortiert), (b) kein Wert leer, (c) jeder in `src/**/*.tsx|ts` per Regex `\bt\(\s*["']([a-zA-Z0-9_.]+)["']` verwendete Schlüssel existiert in `de` (Plural-Schlüssel `hits` zählt über `hits_one`), (d) `initI18n("fr")` liefert `t("modes.read") === "Lecture"`.
- Grundaufteilung (`AppShell`): CSS-Grid mit Zeilen `tabs (36px) / modes (44px) / body (1fr)` und Spalten `thumbs (180px | 0) / 1fr / tools (280px | 0)`; `TabsBar` oben (ein Reiter je Dokument, Schließen-Kreuz, „＋“), `ModesBar` darunter (fünf Arbeitsweisen; nur `read` aktiv, die anderen `aria-disabled="true"` mit `title={t("modes.comingSoon")}`; rechts außen Rückgängig/Wiederholen (deaktiviert) und Speicherzustand-Platzhalter leer), `SidePane side="left"|"right"` mit Einklapp-Knopf; Inhalt der Mitte und der Seitenbereiche kommt über Props (`left`, `center`, `right`). Farben als CSS-Variablen in `tokens.css` (eigene Palette, neutral: `--bg #f3f1ec`, `--paper #fff`, `--ink #23272b`, `--muted #6b7177`, `--line #d9d5cc`, `--accent #2f6f8f`, `--accent-soft #dbe9f0`, `--warn #b8541a`), Schrift `system-ui`; `data-testid` auf `tab`, `mode-read`, `mode-comment`, `pane-left`, `pane-right`, `toggle-left`, `toggle-right`.

Schritte:

- [ ] **Schritt 1:** Test-Werkzeuge installieren: `npm install -D vitest@5 jsdom@31 @testing-library/react@16 @testing-library/jest-dom@8 @testing-library/user-event@14 @types/node` und `npm install i18next@27 react-i18next@18 lucide-react@1 @tauri-apps/plugin-dialog @tauri-apps/plugin-log @tauri-apps/plugin-store`. `vitest.config.ts`: `environment: "jsdom"`, `setupFiles: ["src/test/setup.ts"]`, `include: ["src/**/*.test.{ts,tsx}"]`, `css: false`. `src/test/setup.ts`: `import "@testing-library/jest-dom/vitest"`, Polyfills `URL.createObjectURL = () => "blob:test-" + (counter++)`, `URL.revokeObjectURL = () => {}`, `IntersectionObserver` (ruft den Callback sofort mit `isIntersecting: true` auf; `observe/unobserve/disconnect` leer), `ResizeObserver` (leer), `window.matchMedia` (leer), `Element.prototype.scrollIntoView = () => {}`.

- [ ] **Schritt 2:** Tests schreiben. `src/i18n/catalogs.test.ts` wie oben. `src/app/AppShell.test.tsx`:
  ```tsx
  test("shows the five modes with German labels, only Lesen enabled", () => {
    renderShell();                                     // Helfer: initI18n("de"), BackendProvider(new FakeBackend({})), <AppShell/>
    expect(screen.getByTestId("mode-read")).toHaveTextContent("Lesen");
    expect(screen.getByTestId("mode-comment")).toHaveAttribute("aria-disabled", "true");
    expect(screen.getAllByRole("button", { name: /Kommentieren|Ausfüllen|Seiten|Werkzeuge/ })).toHaveLength(4);
  });
  test("renders French when the language is fr", () => {
    renderShell({ language: "fr" });
    expect(screen.getByTestId("mode-read")).toHaveTextContent("Lecture");
  });
  test("left and right panes collapse and expand", async () => {
    renderShell();
    await userEvent.click(screen.getByTestId("toggle-left"));
    expect(screen.getByTestId("pane-left")).toHaveAttribute("data-collapsed", "true");
    await userEvent.click(screen.getByTestId("toggle-left"));
    expect(screen.getByTestId("pane-left")).toHaveAttribute("data-collapsed", "false");
  });
  test("FakeBackend reports unknown paths as io errors", async () => {
    const fake = new FakeBackend({});
    await expect(fake.openDocument("/nope.pdf")).rejects.toMatchObject({ kind: "io" });
  });
  ```

- [ ] **Schritt 3:** `npm test` → Erwartet: FAIL (Module fehlen).

- [ ] **Schritt 4:** Dateien aus „Schnittstellen“ schreiben; `src/main.tsx`: `initI18n()` vor dem Rendern, `<React.StrictMode><BackendProvider backend={tauriBackend}><App/></BackendProvider></React.StrictMode>`; `src/App.tsx` rendert vorerst `<AppShell center={<p>{t("start.headline")}</p>} />`.

- [ ] **Schritt 5:** `npm test` → Erwartet: alle grün. `npx tsc --noEmit` sauber. `npm run tauri dev` zeigt die leere Werkbank in Deutsch; mit `LANG=fr` nicht prüfbar, dafür Test (b).

- [ ] **Schritt 6:** Commit `feat(ui): backend interface with fake, DE/FR catalogs, workbench layout (variant A)`.

## Task 6: Oberfläche: Dokumente öffnen, anzeigen, zoomen, Miniaturen, Reiter, Passwort, zuletzt geöffnet

**Dateien:**
- Erstellen: `src/state/documents.tsx`, `src/state/documents.test.tsx`, `src/viewer/geometry.ts`, `src/viewer/geometry.test.ts`, `src/viewer/RenderCache.ts`, `src/viewer/RenderCache.test.ts`, `src/viewer/PageImage.tsx`, `src/viewer/DocumentView.tsx`, `src/viewer/DocumentView.test.tsx`, `src/viewer/ThumbnailPane.tsx`, `src/viewer/ThumbnailPane.test.tsx`, `src/app/StartScreen.tsx`, `src/app/StartScreen.test.tsx`, `src/app/Banners.tsx`, `src/app/useOpenFiles.ts`, `src/app/shortcuts.ts`, `src/dialogs/PasswordDialog.tsx`, `src/dialogs/PasswordDialog.test.tsx`, `src/reader/ReaderToolPane.tsx` (Zoom und Seitennavigation; Suche und Lesezeichen kommen in Aufgabe 7 hinzu)
- Ändern: `src/App.tsx`, `src/app/TabsBar.tsx`

**Schnittstellen:**
- `src/state/documents.tsx`:
  ```ts
  export type ZoomMode = { kind: "fitWidth" } | { kind: "fitPage" } | { kind: "percent"; value: number };
  export const ZOOM_STEPS = [50, 67, 75, 90, 100, 125, 150, 200, 300, 400];
  export type DocState = { info: DocumentInfo; zoom: ZoomMode; currentPage: number; hasText: boolean | null };
  export type DocumentsState = { order: number[]; docs: Record<number, DocState>; activeId: number | null };
  export type Action =
    | { type: "opened"; info: DocumentInfo } | { type: "closed"; id: number } | { type: "activated"; id: number }
    | { type: "zoomed"; id: number; zoom: ZoomMode } | { type: "pageChanged"; id: number; page: number }
    | { type: "textKnown"; id: number; hasText: boolean };
  export const initialState: DocumentsState;
  export function reducer(state: DocumentsState, action: Action): DocumentsState;
  export function nextZoom(zoom: ZoomMode, direction: 1 | -1, fitWidthPercent: number): ZoomMode;
  export function DocumentsProvider(props): JSX.Element;        // useReducer + Context
  export function useDocuments(): { state: DocumentsState; dispatch: React.Dispatch<Action>; active: DocState | null };
  ```
  `reducer`-Regeln: `opened` hängt an `order` an und aktiviert; `closed` entfernt und aktiviert den rechten Nachbarn, sonst den linken, sonst `null`; `zoomed`/`pageChanged` nur für bekannte IDs (sonst Zustand unverändert). `nextZoom`: von `fitWidth`/`fitPage` aus wird der aktuelle effektive Prozentwert (`fitWidthPercent`) auf den nächsten Schritt in `ZOOM_STEPS` gerundet.
- `src/viewer/geometry.ts`:
  ```ts
  export const PX_PER_PT = 96 / 72;
  export function cssPageWidth(page: PageInfo, zoom: ZoomMode, viewport: { width: number; height: number }, gutter = 48): number;
  export function effectivePercent(page: PageInfo, cssWidth: number): number;            // = cssWidth / (page.width_pt * PX_PER_PT) * 100
  export function renderWidthFor(cssWidth: number, devicePixelRatio: number): number;      // = Math.min(8000, Math.round(cssWidth * dpr))
  export function rectPtToCss(rect: RectPt, page: PageInfo, cssWidth: number): { left: number; top: number; width: number; height: number };
  ```
  `cssPageWidth`: `fitWidth` → `viewport.width - gutter`; `fitPage` → `Math.min(viewport.width - gutter, (viewport.height - gutter) * page.width_pt / page.height_pt)`; `percent` → `page.width_pt * PX_PER_PT * value / 100`. `rectPtToCss`: Rohgröße `w0 = rotation ∈ {90,270} ? height_pt : width_pt`, `h0` entsprechend; Eckpunkte `(x, y)` nach Drehung in Anzeigekoordinaten (Ursprung oben links, Anzeigebreite `width_pt`): 0° `X = x, Y = h0 − y`; 90° `X = y, Y = x`; 180° `X = w0 − x, Y = y`; 270° `X = h0 − y, Y = w0 − x`; dann min/max der vier Ecken mal `scale = cssWidth / page.width_pt`.
- `src/viewer/RenderCache.ts`: `class RenderCache { constructor(backend: Backend, max = 60); get(id, pageIndex, widthPx): Promise<string>; invalidate(id): void; dispose(): void }`: Schlüssel `${id}:${pageIndex}:${widthPx}`, LRU über Map-Reihenfolge, Objekt-URLs beim Verdrängen und bei `invalidate` mit `URL.revokeObjectURL` freigeben, laufende Anfragen dedupliziert (Map von Promises), Ergebnis für ein inzwischen invalidiertes Dokument wird verworfen (URL sofort widerrufen, Promise mit `{ kind: "unknown_document" }` abgelehnt).
- `PageImage` (`{ docId, page, cssWidth, cache, onVisible? }`): Platzhalter `div` mit `width: cssWidth`, `height: cssWidth * height_pt / width_pt`, Hintergrund `--paper`, Schatten; lädt das Bild erst, wenn sichtbar (`IntersectionObserver`, `rootMargin: "600px"`); `img` mit `data-testid="page-image"`, `alt={t("thumbnails.page", { n })}`, `draggable={false}`.
- `DocumentView` (`{ doc: DocState }`): scrollbarer Container `data-testid="document-view"`, misst sich mit `ResizeObserver`, rendert alle Seiten untereinander (Abstand 16 px), meldet beim Scrollen die Seite, deren Mitte der Viewport-Mitte am nächsten liegt, als `pageChanged`; `scrollToPage(n)` über `ref`/Context; Strg+Mausrad zoomt.
- `ThumbnailPane` (`{ doc: DocState; onSelect(page) }`): eine Spalte, Breite 140 px je Miniatur über denselben `RenderCache` (eigene Instanz, max 200), aktuelle Seite mit Rahmen `--accent`, `aria-current="page"`, Seitenzahl unten rechts; unten der Hinweis `thumbnails.dropHint`.
- `StartScreen` (`{ recent: RecentFile[]; onOpen(): void; onOpenPath(path): void }`): Überschrift, Knopf `actions.open` (`data-testid="open"`), Liste `start.recent` mit `data-testid="recent-item"`.
- `useOpenFiles()` (Hook in `App`): kapselt `openPaths(paths: string[])`: ruft `backend.openDocument`, bei `password_required`/`wrong_password` den `PasswordDialog` (Zustand im Hook), bei Erfolg `dispatch({type:"opened"})`, `backend.hasText(id)` → `textKnown`, Recent-Liste aktualisieren (vorn einfügen, Duplikate per Pfad entfernen, maximal 10, `saveRecentFiles`), bei `kind === "io"` Eintrag aus Recent entfernen; Fehler als Meldung oben (`role="alert"`, Text aus `errors.<kind>`, sonst `errors.unknown`). Registriert `onFilesDropped` (nur `.pdf`, Groß/Klein egal) und öffnet beim ersten Mount die `startupFile()` genau einmal (`useRef`-Wächter, weil StrictMode Effekte doppelt ausführt).
- `shortcuts.ts`: Tabelle `{ "Ctrl+O": "open", "Ctrl+W": "closeActive", "Ctrl+=": "zoomIn", "Ctrl+-": "zoomOut", "Ctrl+0": "fitWidth", "Ctrl+1": "fitPage", "PageDown": "nextPage", "PageUp": "prevPage", "Home": "firstPage", "End": "lastPage", "Ctrl+F": "focusSearch", "Ctrl+P": "print", "Ctrl+Tab": "nextTab" }` (auf macOS `Meta` statt `Ctrl`); `matchShortcut(e: KeyboardEvent): ShortcutAction | null`.
- `Banners` (`{ doc: DocState }`): `form === "xfa"` → Infozeile `banners.xfa`; `permissions.print === false` → `banners.noPrint` (beide `role="status"`, schließbar).
- `PasswordDialog` (`{ fileName, error?: "wrong" | null, onSubmit(password), onCancel }`): modal, Eingabe `type="password"` mit Autofokus, Enter sendet, Esc bricht ab.

Schritte:

- [ ] **Schritt 1:** Tests schreiben (Auszug der Zusicherungen; jeder Test ein eigener `test(...)`):
  - `documents.test.tsx`: `opened` zweimal → `order` `[1,2]`, `activeId` 2; `closed` 2 → `activeId` 1; `closed` des mittleren von drei → aktiv wird der rechte Nachbar; `closed` des letzten → aktiv `null`; `zoomed` für unbekannte ID lässt den Zustand referenzgleich; `nextZoom({kind:"fitWidth"}, 1, 83)` → `{kind:"percent", value: 90}`; `nextZoom({kind:"percent", value:400}, 1, 0)` bleibt 400.
  - `geometry.test.ts`: `cssPageWidth(A4, fitWidth, {width: 1048, height: 800})` → 1000; `cssPageWidth(A4, fitPage, {width: 1048, height: 800})` → `(800-48) * 595.3/841.9` ≈ 531.7 (±0.1); `percent 100` → `595.3 * 96/72` ≈ 793.7; `renderWidthFor(1000, 2)` → 2000, `renderWidthFor(5000, 2)` → 8000; `rectPtToCss({left: 72, bottom: 750, right: 172, top: 764}, A4 rot 0, 595.3)` → `{left: 72, top: 841.9-764 = 77.9, width: 100, height: 14}` (±0.1); dieselbe Rect auf einer um 90° gedrehten Seite (`PageInfo{width_pt: 841.9, height_pt: 595.3, rotation: 90}`, cssWidth 841.9) → `left: 750, top: 72, width: 14, height: 100`; 180° → `left: 595.3-172 = 423.3, top: 750`; 270° → `left: 841.9-764 = 77.9, top: 595.3-172 = 423.3`.
  - `RenderCache.test.ts`: zwei `get` mit gleichem Schlüssel rufen das Backend einmal (`fake.calls` enthält genau ein `render:1:0:900`); nach `invalidate(1)` ruft `get` erneut; bei `max = 2` wird der älteste Eintrag verdrängt und `revokeObjectURL` dafür aufgerufen (Spy); `get` für eine während des Ladens invalidierte ID wird mit `kind: "unknown_document"` abgelehnt.
  - `DocumentView.test.tsx` (FakeBackend mit `"/a.pdf": {page_count: 3, pages: [A4, A4, A4]}`): rendert drei Platzhalter mit Höhe `Math.round(1000 * 841.9/595.3)` px bei Viewport 1048×800 und `fitWidth`; nach dem Laden gibt es drei `page-image` mit `src` beginnend `blob:`; `zoomed` auf `percent 200` fordert Breite `Math.round(595.3*96/72*2 * devicePixelRatio)` an (`fake.calls` enthält `render:1:0:<n>`).
  - `ThumbnailPane.test.tsx`: drei Miniaturen; die zweite trägt `aria-current="page"`, wenn `currentPage` 1 ist; Klick auf die dritte ruft `onSelect(2)`.
  - `StartScreen.test.tsx` + `App`-Integration: ohne Dokumente erscheint `start.headline`; `fake.startupPath = "/a.pdf"` und Rendern unter `<React.StrictMode>` → `fake.calls.filter(c => c.startsWith("open:")).length === 1` und ein Reiter „a.pdf“; `fake.dropFiles(["/b.PDF", "/c.txt"])` öffnet genau `/b.PDF`; Recent-Liste zeigt danach `b.PDF` vor `a.pdf` und `fake.recent` hat Länge 2; Öffnen eines unbekannten Pfads aus Recent entfernt den Eintrag und zeigt `errors.io` als `alert`; zwei Dokumente offen, Strg+W schließt das aktive, der Nachbar ist aktiv, `fake.calls` enthält `close:2`.
  - `PasswordDialog.test.tsx` + Integration: Fixture mit `password: "geheim"`: Öffnen zeigt den Dialog mit Dateiname; falsches Passwort zeigt `password.wrong`; richtiges öffnet und `fake.calls` enthält `open:/p.pdf:geheim`; Esc schließt ohne Dokument.

- [ ] **Schritt 2:** `npm test` → Erwartet: FAIL.

- [ ] **Schritt 3:** Dateien aus „Schnittstellen“ umsetzen; `App.tsx` verdrahtet `DocumentsProvider`, `useOpenFiles`, `AppShell` mit `left={active ? <ThumbnailPane/> : null}`, `center={active ? <><Banners/><DocumentView/></> : <StartScreen/>}`, `right={active ? <ReaderToolPane/> : null}`, Tastenkürzel am `window` (`keydown`), Reiterwechsel über `TabsBar`.

- [ ] **Schritt 4:** `npm test` und `npx tsc --noEmit` → grün. `npm run tauri dev` mit `PAGINAE_OPEN` auf dem Prüf-PDF: drei Seiten untereinander, Miniaturen links, Zoom-Knöpfe rechts, Strg+Mausrad zoomt, zweites PDF per Ziehen aus dem Explorer öffnet einen zweiten Reiter.

- [ ] **Schritt 5:** Commit `feat(ui): document tabs, continuous page view with zoom, thumbnails, password dialog, recent files`.

## Task 7: Oberfläche: Suche mit Trefferhervorhebung und Lesezeichen

**Dateien:**
- Erstellen: `src/reader/SearchPanel.tsx`, `src/reader/SearchPanel.test.tsx`, `src/reader/useSearch.ts`, `src/viewer/HitOverlay.tsx`, `src/reader/BookmarksPanel.tsx`, `src/reader/BookmarksPanel.test.tsx`
- Ändern: `src/reader/ReaderToolPane.tsx`, `src/viewer/PageImage.tsx` (Overlay-Slot), `src/app/shortcuts.ts` (F3, Shift+F3, Esc)

**Schnittstellen:**
- `useSearch(docId)`: `{ query, setQuery, run(): Promise<void>, hits: SearchHit[], current: number, next(), prev(), clear(), status: "idle" | "searching" | "done" }`; `run` ruft `backend.search`, setzt `current = 0`, und löst `scrollToPage(hits[0].page_index)` aus; `next/prev` zyklisch.
- `HitOverlay` (`{ hits: SearchHit[]; page: PageInfo; cssWidth: number; currentKey?: string }`): absolut positionierte `div`s aus `rectPtToCss`, Klasse `hit` (halbtransparent `--accent`), aktueller Treffer `hit current` (`--warn`), `data-testid="hit"`.
- `SearchPanel`: Eingabefeld (`data-testid="search-input"`, Enter startet), Zähler `reader.hits` mit `count`, Knöpfe vor/zurück, Meldungen `reader.noHits` bzw. `reader.noText` (wenn `doc.hasText === false`), Liste der Treffer gruppiert nach Seite („Seite 2 · 3 Treffer“), Klick springt.
- `BookmarksPanel` (`{ bookmarks: Bookmark[]; onGo(page) }`): Baum mit Auf/Zu je Knoten (`aria-expanded`), Klick auf Titel ruft `onGo`; Einträge ohne `page_index` sind nicht klickbar; leer → `reader.noBookmarks`.
- `ReaderToolPane` zeigt Abschnitte in dieser Reihenfolge: Zoom und Seite, Suche, Lesezeichen, Drucken (Knopf kommt in Aufgabe 8).

Schritte:

- [ ] **Schritt 1:** Tests: `SearchPanel.test.tsx` (Fixture mit `hits: [{page_index: 1, rects: [R]}, {page_index: 1, rects: [R2]}, {page_index: 2, rects: [R3]}]`): Eingabe „echternach“ + Enter → `fake.calls` enthält `search:1:echternach`, Zähler „3 Treffer“, Gruppen „Seite 2“ und „Seite 3“; F3 zweimal → `current` 2 und der dritte Treffer trägt Klasse `current`; `HitOverlay` auf Seite 2 (Index 1) rendert zwei `hit`-Elemente mit `left/top` aus `rectPtToCss`; Fixture ohne Text (`hasText: false`) → nach der Suche erscheint `reader.noText`; Esc leert die Suche und entfernt die Overlays. `BookmarksPanel.test.tsx`: zwei Wurzeln, eine mit zwei Kindern eingeklappt; Aufklappen zeigt die Kinder; Klick auf Kind ruft `onGo(4)`; leer → `reader.noBookmarks`.

- [ ] **Schritt 2:** `npm test` → FAIL. Schritt 3: umsetzen. Schritt 4: `npm test`, `tsc` grün; `tauri dev`: Suche nach „Echternach“ hebt den Treffer gelb hervor und scrollt hin.

- [ ] **Schritt 5:** Commit `feat(ui): in-document search with highlighted hits, bookmark tree`.

## Task 8: Drucken über den Systemdialog

**Dateien:**
- Erstellen: `print.html`, `src/print/main.tsx`, `src/print/PrintView.tsx`, `src/print/PrintView.test.tsx`, `src-tauri/src/print.rs`
- Ändern: `vite.config.ts` (`build.rollupOptions.input = { main: "index.html", print: "print.html" }`), `src-tauri/src/lib.rs` (Befehle registrieren), `src/reader/ReaderToolPane.tsx` (Knopf `actions.print`, deaktiviert wenn `permissions.print === false`), `src/app/shortcuts.ts` (Ctrl+P)

**Schnittstellen:**
- Hülle (`print.rs`): `print_document(app: AppHandle, id: DocId) -> Result<(), CommandError>` erzeugt (oder fokussiert) ein `WebviewWindow` mit Label `print`, `WebviewUrl::App("print.html?id=<id>".into())`, Titel aus `t("print.title")` (der Titel wird von der Druckansicht selbst per `getCurrentWindow().setTitle` gesetzt, Rust setzt „Paginae“), Größe 900×700, `center`; `print_window_ready() -> Result<(), CommandError>` ruft `app.get_webview_window("print").print()` (`tauri::Webview::print`, vorhanden in tauri 2.12, läuft auf Windows und macOS); `close_print_window()` schließt das Fenster. Permission: keine zusätzliche nötig (Fensterbau in Rust).
- Druckansicht (`PrintView`): liest `id` aus der URL, holt `document_info`, rendert jede Seite nacheinander mit `renderWidthFor` für 300 dpi (`Math.min(8000, Math.round(width_pt / 72 * 300))`), zeigt Fortschritt `print.preparing`, danach alle Seiten als `img` (`width: 100%`, je Seite `page-break-after: always`), CSS `@page { margin: 0; size: auto }`, ruft nach dem Laden aller Bilder `print_window_ready` und zeigt `print.ready`; `window.addEventListener("afterprint", () => invoke("close_print_window"))`. Keine Bedienelemente außer „Schließen“.
- Zum Testen ist `PrintView` eine reine Komponente `{ backend, docId }` ohne Tauri-Fensterbezug; das Fenster-Handling liegt in `src/print/main.tsx`.

Schritte:

- [ ] **Schritt 1:** Tests `PrintView.test.tsx` (FakeBackend, 3 Seiten): nach dem Laden drei `img` in Seitenreihenfolge, jede Render-Anfrage mit Breite 2481 (`Math.round(595.3/72*300)`); `fake.calls` enthält `print_ready` genau einmal, erst nachdem alle drei Bilder geladen sind (der Test löst `onload` synchron nach der `src`-Zuweisung aus, über `Object.defineProperty(HTMLImageElement.prototype, "src", …)`). `printWindowReady` ist seit Aufgabe 5 Teil der `Backend`-Schnittstelle. Rust: `cargo test -p paginae` hat hier nichts zu prüfen außer dem Bau.

- [ ] **Schritt 2:** `npm test` → FAIL. Schritt 3: umsetzen (`print.rs`, Registrierung in `generate_handler!`, Vite-Mehrseiten-Bau). Schritt 4: `npm test`, `cargo build`, `npm run build` grün (`dist/print.html` vorhanden).

- [ ] **Schritt 5:** Handprobe Windows: Prüf-PDF öffnen, Strg+P → Fenster „Druckansicht“, Druckdialog von Windows erscheint, Ziel „Microsoft Print to PDF“ → die erzeugte PDF hat 3 Seiten mit dem Text. Nach dem Druck schließt sich das Fenster. Ergebnis als Satz in die Commit-Nachricht. Mac: Punkt der Handtest-Checkliste (Aufgabe 10).

- [ ] **Schritt 6:** Commit `feat(print): raster print view at 300 dpi through the system print dialog`.

## Task 9: Prüfstände: Lizenzen, Netz, Ende-zu-Ende, GitHub Actions

**Dateien:**
- Erstellen: `deny.toml`, `scripts/check-licenses.mjs`, `scripts/check-network-deps.mjs`, `scripts/enable-e2e-capability.mjs`, `wdio.conf.ts`, `e2e/tsconfig.json`, `e2e/specs/open-and-render.spec.ts`, `.github/workflows/ci.yml`
- Ändern: `package.json` (devDependencies `@wdio/cli@10 @wdio/mocha-framework@10 @wdio/tauri-service@1 license-checker-rseidelsohn@5`), `README.md` (Abschnitt Tests)

**Schnittstellen:**
- `deny.toml`: `[licenses] allow = ["MIT", "Apache-2.0", "Apache-2.0 WITH LLVM-exception", "BSD-2-Clause", "BSD-3-Clause", "ISC", "MPL-2.0", "Zlib", "0BSD", "CC0-1.0", "BSL-1.0", "Unicode-3.0"]`, `[bans] multiple-versions = "allow"`, `[advisories] ignore = []`. Kommt bei `cargo deny check licenses` eine Lizenz hinzu, die permissiv ist, aber fehlt (z. B. `Unicode-DFS-2016`, `OpenSSL`-ähnliche sind auszuschließen), wird sie mit Begründung in `docs/THIRD-PARTY.md` aufgenommen; alles mit AGPL/GPL/SSPL/BUSL scheitert.
- `scripts/check-licenses.mjs`: ruft `license-checker-rseidelsohn --production --json --excludePrivatePackages`, erlaubt `MIT, ISC, Apache-2.0, BSD-2-Clause, BSD-3-Clause, 0BSD, CC0-1.0, MPL-2.0, Unlicense, CC-BY-4.0, Python-2.0, BlueOak-1.0.0` (auch als `OR`-Kombination), listet Verstöße mit Paketname und beendet mit Code 1.
- `scripts/check-network-deps.mjs`: scheitert, wenn `Cargo.lock` eines der Pakete `reqwest, hyper, hyper-util, ureq, curl, isahc, surf, attohttpc, tokio-tungstenite, tungstenite, async-tungstenite` enthält oder `package-lock.json` unter `packages` (ohne `dev: true`) eines von `axios, node-fetch, undici, ws, socket.io-client, got, ky` ; Ausnahmeliste `ALLOWED = []` mit Kommentar, dass der Updater in Etappe 5 `reqwest` über `tauri-plugin-updater` mit Begründung einträgt. Ausgabe: `network check: ok` oder die Treffer.
- Ende-zu-Ende: `wdio.conf.ts` mit `services: [["@wdio/tauri-service", { appBinaryPath: process.env.PAGINAE_BIN, driverProvider: process.platform === "darwin" ? "embedded" : "official" }]]`, `capabilities: [{ browserName: "tauri", "tauri:options": { application: process.env.PAGINAE_BIN } }]`, `framework: "mocha"`, `specs: ["./e2e/specs/**/*.spec.ts"]`, Umgebungsvariable `PAGINAE_OPEN` auf ein vor dem Lauf erzeugtes Fixture (`cargo run -p paginae-core --example make_fixture -- e2e/.tmp/fixture.pdf`). Spec:
  ```ts
  describe("Paginae opens a PDF at start-up", () => {
    it("shows the file tab and renders page 1", async () => {
      const tab = await $('[data-testid="tab"]');
      await expect(tab).toHaveText(expect.stringContaining("fixture.pdf"));
      const img = await $('[data-testid="page-image"]');
      await img.waitForDisplayed({ timeout: 15000 });
      expect(await browser.execute((el) => (el as HTMLImageElement).naturalWidth, img)).toBeGreaterThan(100);
    });
  });
  ```
  Windows: Release-Bau `npm run tauri build -- --no-bundle`, Binärdatei `src-tauri/target/release/paginae.exe`. macOS: Bau mit `--features e2e` und vorher `node scripts/enable-e2e-capability.mjs` (schreibt `src-tauri/capabilities/e2e.json` mit `"permissions": ["wdio-webdriver:default"]`, Fenster `main`; die Datei ist in `.gitignore`), Binärdatei `src-tauri/target/aarch64-apple-darwin/release/paginae`.
- `ci.yml`: Auslöser `push` auf `main` und `pull_request`; Job `test` mit Matrix `windows-latest`, `macos-latest` (Apple Silicon): `actions/checkout@v4`, `actions/setup-node@v4` (`node-version: 24`, `cache: npm`), `dtolnay/rust-toolchain@stable` (`targets: aarch64-apple-darwin` auf macOS), `swatinem/rust-cache@v2`, `npm ci`, `npm run fetch:pdfium`, `cargo fmt --all --check`, `cargo clippy --workspace --all-targets -- -D warnings`, `cargo test --workspace`, `npx tsc --noEmit`, `npm test`, `npm run check:licenses`, `npm run check:network`, Bau `npm run tauri build` (macOS mit `-- --target aarch64-apple-darwin`), `actions/upload-artifact@v4` mit `src-tauri/target/**/bundle/nsis/*.exe` bzw. `**/bundle/dmg/*.dmg`; Job `licenses-rust` auf `ubuntu-latest` mit `EmbarkStudios/cargo-deny-action@v2` (`command: check licenses bans`); Job `e2e` je Plattform nach `test`: Fixture erzeugen, Binärdatei bauen wie oben, `npm run e2e` mit `PAGINAE_BIN` und `PAGINAE_OPEN`; der macOS-Lauf trägt `continue-on-error: true` (Wegwerfversuch laut Design) und lädt `e2e/logs/**` als Artefakt hoch.

Schritte:

- [ ] **Schritt 1:** Skripte und Konfigurationen schreiben; `npm run check:licenses`, `npm run check:network`, `cargo install cargo-deny --locked` einmalig lokal, `cargo deny check licenses bans`. Erwartet: alle drei `ok`; falls `cargo deny` eine fehlende permissive Lizenz meldet, nach der Regel oben ergänzen.

- [ ] **Schritt 2:** Lokaler E2E-Lauf unter Windows: Fixture erzeugen, `npm run tauri build -- --no-bundle`, `$env:PAGINAE_BIN="src-tauri/target/release/paginae.exe"; $env:PAGINAE_OPEN="<abs>/e2e/.tmp/fixture.pdf"; npm run e2e`. Erwartet: 1 Spec bestanden. Hinweis: Der Dienst lädt den passenden Edge WebDriver automatisch (`autoDownloadEdgeDriver`); schlägt das fehl, Version von WebView2 aus `%ProgramFiles(x86)%\Microsoft\EdgeWebView\Application` ablesen und den Treiber von Hand setzen (`edgeDriverPath`).

- [ ] **Schritt 3:** `ci.yml` schreiben, committen (`ci: tests, license and network checks, builds and e2e on Windows and macOS`), pushen, Lauf abwarten. Erwartet: Jobs `test` (beide), `licenses-rust` grün; `e2e` Windows grün; `e2e` macOS: Ergebnis festhalten. Grün → macOS-E2E bleibt Pflicht (`continue-on-error` entfernen, Folge-Commit). Rot → Protokoll sichern, `continue-on-error` bleibt, und in der Design-Notiz unter Protokoll eintragen, dass die automatische Mac-Prüfung aus Rust-Tests, Browser-Tests und Bau besteht und die Bedienung der Mac-App Jerome nach Checkliste prüft (Rückfallregel des Designs). Nicht länger als zwei Reparaturversuche in den macOS-E2E stecken.

- [ ] **Schritt 4:** README-Abschnitt „Tests“ (EN) mit den sechs Befehlen; Commit `docs: how to run the checks`.

## Task 10: Abschluss, Dokumentation, Übergabe an Jeromes Handtest

**Dateien:**
- Erstellen: `docs/ARCHITECTURE.md`, `scripts/third-party-report.mjs`
- Ändern: `docs/THIRD-PARTY.md`, `README.md`
- Vault (außerhalb des Repos): `02 Projekte/PDF-Werkstatt für Schulen/2026-MM-TT Handtest Paginae Etappe 1.md` (neu, tags `projekt-notiz`, status `aktiv`), Projektdatei `PDF-Werkstatt für Schulen.md` (Projektphase, Status, Nächste Schritte), Übersicht [[2026-11-19 Plan Paginae Bauabschnitt 1 Übersicht]] (Stand Etappe 1), diese Plan-Notiz (`status: abgeschlossen`)

Schritte:

- [ ] **Schritt 1:** `docs/ARCHITECTURE.md` (EN, eine Seite): die drei Schichten, der Weg eines Render-Aufrufs (UI → `invoke` → `Workspace::render_png` → PNG → `ArrayBuffer` → Blob-URL), Koordinatensysteme (PDF-Punkte unten links, CSS oben links, `rectPtToCss` als einzige Umrechnung), Zustandsmodell (`DocumentsState`), warum ein `Engine` je Prozess, Protokollpfade, Testebenen (Rust, Vitest gegen `FakeBackend`, WDIO), Konventionen (Fehler-`kind`, i18n-Schlüssel).
- [ ] **Schritt 2:** `scripts/third-party-report.mjs` erzeugt aus `cargo metadata` (Felder `name`, `version`, `license`) und `license-checker-rseidelsohn --production --json` die Tabelle in `docs/THIRD-PARTY.md` (sortiert, mit festen Zeilen für PDFium und pdfium-binaries oben). `npm run licenses:report` in `package.json`. Lauf, Ergebnis committen.
- [ ] **Schritt 3:** Handtest-Checkliste im Vault (Deutsch, je Punkt Windows und Mac mit Ergebnisfeld): Installer startet ohne Adminrechte; Mac: Gatekeeper-Weg (Systemeinstellungen › Datenschutz & Sicherheit › „Dennoch öffnen“) mit Bildschirmfotos; drei Prüf-PDFs öffnen (Elternbrief, Formular, zusammengeführte Datei), Reiter, Ziehen aus Explorer/Finder, Zoom mit Strg/Cmd+Mausrad und Knöpfen, Miniaturen springen, Suche mit Hervorhebung, Lesezeichen einer Datei mit Gliederung, Drucken auf PDF-Drucker, Datei mit Akzenten im Namen, Datei aus OneDrive, Fenster klein ziehen (900×600), Protokolldatei finden, Sprache Französisch (Systemsprache umstellen oder Windows-Anzeigesprache), Start ohne Netz.
- [ ] **Schritt 4:** Vault nachziehen: Projektdatei „Projektphase: Umsetzung Etappe 1 abgeschlossen (Datum), Handtest offen“, nächste Schritte (Jerome: Handtest nach Checkliste; danach Plan Etappe 2); Übersicht: Etappe 1 „umgesetzt, Handtest offen“; Design-Notiz Protokoll: ein Eintrag mit CI-Ergebnis und E2E-Befund macOS.
- [ ] **Schritt 5:** `git tag -a etappe-1 -m "Etappe 1 Grundgerüst"`, `git push --tags`; Commit `docs: architecture, third-party report, hand-off to manual test`.
- [ ] **Schritt 6:** Bericht an Jerome: eine Zeile je Aufgabe, Link zum Repository und zu den CI-Artefakten (Installer), Hinweis, dass die Mac-DMG ungetestet ist, bis der Mac mini steht.

---

## Selbstprüfung (2026-11-19)

- **Spec-Abdeckung Etappe 1:** Öffnen, blättern, zoomen, suchen, Miniaturen, Lesezeichen anzeigen, drucken, zuletzt geöffnet (Aufgaben 3, 6, 7, 8); Grundaufteilung A, Reiter, einklappbare Bereiche (5, 6); DE/FR mit Prüflauf (5); Protokolldatei ohne Inhalte und Pfade (4); geschützte PDFs: Rechte gelesen, Drucken gesperrt, Passwortdialog (3, 6); XFA erkannt und benannt (3, 6); kein Netz plus Prüflauf (9); Lizenzprüflauf (9); Bau beider Systeme in Actions, Windows-E2E, Mac-E2E als Wegwerfversuch mit Rückfallregel (9); öffentliches Repository (1). Nicht in Etappe 1 (Übersicht): Seitenoperationen, Rückgängig, Sicherungsnetz, Kommentare, Ausfüllen, Hilfe, „Problem melden“, Einstellungen, Updater, Signatur, Dateizuordnung `.pdf`, Zwei-Seiten-Ansicht.
- **Typen:** `DocumentInfo`/`PageInfo`/`SearchHit`/`Bookmark`/`RectPt` in Rust (Aufgabe 3) und TypeScript (Aufgabe 5) feldgleich; Befehlsnamen in Aufgabe 4 und `tauriBackend` identisch; `Backend` um `printWindowReady` ergänzt (Aufgabe 8 verweist auf Aufgabe 5).
- **Schrittprüfung:** jeder Schritt hat Datei, Signatur oder Testzusicherung; Code nur dort als Volltext, wo er in der Vorab-Probe geprüft wurde (Aufgaben 2 bis 4) oder einen Algorithmus mit festen Werten trägt (Fetch-Skript).
- **Prüfschwerpunkte:** alle fünf haben einen Test (3: Breitenbegrenzung, Akzentpfad; 6: StrictMode-Einmalöffnen, Nachbarreiter; 7: Scan ohne Text).
- **Proportion:** der Plan ist kürzer als der Code der Etappe; die Volltexte betreffen rund 450 Zeilen geprüften Kern.

## Protokoll

- 2026-11-19: Entwurf nach Vorab-Probe im Scratchpad (Kern und Hülle gebaut, 8 Tests grün, `tauri dev` rendert das Prüf-PDF). Wartet auf Jeromes Durchsicht und die Wahl der Ausführungsart.
