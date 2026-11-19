// Provisional smoke-test UI (Task 4). Replaced in Task 5.
import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

interface DocumentInfo {
  id: number;
  file_name: string;
  page_count: number;
}

function App() {
  const [status, setStatus] = useState("starting");
  const [src, setSrc] = useState<string | null>(null);

  async function show(path: string) {
    try {
      const info = await invoke<DocumentInfo>("open_document", { path, password: null });
      const t0 = performance.now();
      const buf = await invoke<ArrayBuffer>("render_page", { id: info.id, pageIndex: 0, widthPx: 900 });
      const ms = Math.round(performance.now() - t0);
      setSrc(URL.createObjectURL(new Blob([buf], { type: "image/png" })));
      setStatus(`${info.file_name}: ${info.page_count} pages, rendered in ${ms} ms`);
    } catch (e) {
      setStatus(`error: ${JSON.stringify(e)}`);
    }
  }

  useEffect(() => {
    invoke<string | null>("startup_file").then((p) => {
      if (p) void show(p);
      else setStatus("no startup file");
    });
  }, []);

  return (
    <main>
      <button
        onClick={async () => {
          const p = await open({ filters: [{ name: "PDF", extensions: ["pdf"] }] });
          if (typeof p === "string") void show(p);
        }}
      >
        Open PDF
      </button>
      <p>{status}</p>
      {src && <img src={src} alt="page 1" style={{ maxWidth: "100%" }} />}
    </main>
  );
}

export default App;
