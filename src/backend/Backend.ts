import type { Bookmark, DocumentInfo, RecentFile, SearchHit } from "./types";

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
