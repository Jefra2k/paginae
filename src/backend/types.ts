// TypeScript mirror of the Rust types serialised by the Tauri shell (snake_case fields).

export type FormKind = "none" | "acro_form" | "xfa";

export interface Permissions {
  print: boolean;
  modify: boolean;
  copy: boolean;
  annotate: boolean;
  fill_forms: boolean;
  assemble: boolean;
}

/** Displayed page size after rotation, in PDF points. */
export interface PageInfo {
  index: number;
  width_pt: number;
  height_pt: number;
  rotation: number;
}

export interface DocumentInfo {
  id: number;
  path: string;
  file_name: string;
  title: string | null;
  page_count: number;
  pages: PageInfo[];
  form: FormKind;
  permissions: Permissions;
  encrypted: boolean;
}

/** Rectangle in PDF points, origin bottom-left. */
export interface RectPt {
  left: number;
  bottom: number;
  right: number;
  top: number;
}

export interface SearchHit {
  page_index: number;
  rects: RectPt[];
}

export interface Bookmark {
  title: string;
  page_index: number | null;
  children: Bookmark[];
}

export interface CommandError {
  kind: string;
  message: string;
}

export interface RecentFile {
  path: string;
  name: string;
  openedAt: string;
}

export function isCommandError(e: unknown): e is CommandError {
  return (
    typeof e === "object" &&
    e !== null &&
    typeof (e as { kind?: unknown }).kind === "string" &&
    typeof (e as { message?: unknown }).message === "string"
  );
}
