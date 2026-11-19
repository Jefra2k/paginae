import type { Backend } from "./Backend";
import type { Bookmark, CommandError, DocumentInfo, RecentFile, SearchHit } from "./types";

export type FakeFixture = Partial<DocumentInfo> & {
  password?: string;
  hits?: SearchHit[];
  bookmarks?: Bookmark[];
  hasText?: boolean;
};

// A valid 1x1 RGBA PNG, 67 bytes.
const PNG_1X1 = new Uint8Array([
  137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196,
  137, 0, 0, 0, 10, 73, 68, 65, 84, 120, 156, 99, 0, 1, 0, 0, 5, 0, 1, 13, 10, 45, 180, 0, 0, 0, 0, 73, 69, 78, 68,
  174, 66, 96, 130,
]);

const A4_WIDTH_PT = 595;
const A4_HEIGHT_PT = 842;

function fail(kind: string, message: string): CommandError {
  return { kind, message };
}

interface OpenDoc {
  info: DocumentInfo;
  fixture: FakeFixture;
}

/** In-memory Backend for tests: fixtures are keyed by path, every call is recorded in `calls`. */
export class FakeBackend implements Backend {
  readonly calls: string[] = [];
  startupPath: string | null = null;
  recent: RecentFile[] = [];

  private readonly fixtures: Record<string, FakeFixture>;
  private readonly docs = new Map<number, OpenDoc>();
  private readonly dropHandlers = new Set<(paths: string[]) => void>();
  private nextId = 1;

  constructor(fixtures: Record<string, FakeFixture>) {
    this.fixtures = fixtures;
  }

  async openDocument(path: string, password?: string): Promise<DocumentInfo> {
    this.calls.push(password === undefined ? `open:${path}` : `open:${path}:${password}`);
    const fixture = this.fixtures[path];
    if (!fixture) throw fail("io", `cannot read ${path}`);
    if (fixture.password !== undefined) {
      if (password === undefined) throw fail("password_required", `${path} needs a password`);
      if (password !== fixture.password) throw fail("wrong_password", `wrong password for ${path}`);
    }
    const { password: secret, hits: _hits, bookmarks: _bookmarks, hasText: _hasText, ...partial } = fixture;
    const pageCount = partial.pages?.length ?? partial.page_count ?? 1;
    const pages =
      partial.pages ??
      Array.from({ length: pageCount }, (_, index) => ({
        index,
        width_pt: A4_WIDTH_PT,
        height_pt: A4_HEIGHT_PT,
        rotation: 0,
      }));
    const info: DocumentInfo = {
      path,
      file_name: path.split(/[\\/]/).pop() ?? path,
      title: null,
      form: "none",
      permissions: { print: true, modify: true, copy: true, annotate: true, fill_forms: true, assemble: true },
      encrypted: secret !== undefined,
      ...partial,
      id: this.nextId++,
      page_count: pageCount,
      pages,
    };
    this.docs.set(info.id, { info, fixture });
    return info;
  }

  async documentInfo(id: number): Promise<DocumentInfo> {
    this.calls.push(`info:${id}`);
    return this.doc(id).info;
  }

  async closeDocument(id: number): Promise<void> {
    this.calls.push(`close:${id}`);
    this.doc(id);
    this.docs.delete(id);
  }

  async renderPage(id: number, pageIndex: number, widthPx: number): Promise<Blob> {
    this.calls.push(`render:${id}:${pageIndex}:${widthPx}`);
    const { info } = this.doc(id);
    if (pageIndex < 0 || pageIndex >= info.page_count) {
      throw fail("page_out_of_range", `page ${pageIndex} of ${info.page_count}`);
    }
    await Promise.resolve();
    return new Blob([PNG_1X1], { type: "image/png" });
  }

  async search(id: number, query: string): Promise<SearchHit[]> {
    this.calls.push(`search:${id}:${query}`);
    return this.doc(id).fixture.hits ?? [];
  }

  async bookmarks(id: number): Promise<Bookmark[]> {
    this.calls.push(`bookmarks:${id}`);
    return this.doc(id).fixture.bookmarks ?? [];
  }

  async hasText(id: number): Promise<boolean> {
    this.calls.push(`hasText:${id}`);
    return this.doc(id).fixture.hasText ?? true;
  }

  async startupFile(): Promise<string | null> {
    return this.startupPath;
  }

  async pickPdf(): Promise<string | null> {
    return null;
  }

  async onFilesDropped(handler: (paths: string[]) => void): Promise<() => void> {
    this.dropHandlers.add(handler);
    return () => {
      this.dropHandlers.delete(handler);
    };
  }

  /** Simulates files dropped onto the window. */
  dropFiles(paths: string[]): void {
    for (const handler of this.dropHandlers) handler(paths);
  }

  async loadRecentFiles(): Promise<RecentFile[]> {
    return [...this.recent];
  }

  async saveRecentFiles(files: RecentFile[]): Promise<void> {
    this.recent = [...files];
  }

  async printDocument(id: number): Promise<void> {
    this.calls.push(`print:${id}`);
  }

  async printWindowReady(): Promise<void> {
    this.calls.push("print_ready");
  }

  private doc(id: number): OpenDoc {
    const doc = this.docs.get(id);
    if (!doc) throw fail("unknown_document", `document ${id} is not open`);
    return doc;
  }
}
