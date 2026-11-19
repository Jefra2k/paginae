import { invoke } from "@tauri-apps/api/core";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { open } from "@tauri-apps/plugin-dialog";
import { load, type Store } from "@tauri-apps/plugin-store";
import type { Backend } from "./Backend";
import type { Bookmark, DocumentInfo, RecentFile, SearchHit } from "./types";

const RECENT_KEY = "files";
let recentStore: Promise<Store> | null = null;

function recentFilesStore(): Promise<Store> {
  recentStore ??= load("recent.json", { autoSave: true }).catch((e: unknown) => {
    recentStore = null; // let the next call retry
    throw e;
  });
  return recentStore;
}

export const tauriBackend: Backend = {
  openDocument: (path, password) => invoke<DocumentInfo>("open_document", { path, password: password ?? null }),
  documentInfo: (id) => invoke<DocumentInfo>("document_info", { id }),
  closeDocument: (id) => invoke<void>("close_document", { id }),
  renderPage: async (id, pageIndex, widthPx) =>
    new Blob([await invoke<ArrayBuffer>("render_page", { id, pageIndex, widthPx })], { type: "image/png" }),
  search: (id, query) => invoke<SearchHit[]>("search_document", { id, query }),
  bookmarks: (id) => invoke<Bookmark[]>("document_bookmarks", { id }),
  hasText: (id) => invoke<boolean>("document_has_text", { id }),
  startupFile: () => invoke<string | null>("startup_file"),
  pickPdf: async () => {
    const picked = await open({ multiple: false, filters: [{ name: "PDF", extensions: ["pdf"] }] });
    return typeof picked === "string" ? picked : null;
  },
  onFilesDropped: (handler) =>
    getCurrentWebview().onDragDropEvent((e) => {
      if (e.payload.type === "drop") handler(e.payload.paths);
    }),
  loadRecentFiles: async () => (await (await recentFilesStore()).get<RecentFile[]>(RECENT_KEY)) ?? [],
  saveRecentFiles: async (files) => {
    await (await recentFilesStore()).set(RECENT_KEY, files);
  },
  // The two print commands arrive in Task 8; until then these methods exist but are unused.
  printDocument: (id) => invoke<void>("print_document", { id }),
  printWindowReady: () => invoke<void>("print_window_ready"),
};
