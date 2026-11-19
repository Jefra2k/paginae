import { createContext, useContext, useMemo, useReducer, type Dispatch, type JSX, type ReactNode } from "react";
import type { DocumentInfo } from "../backend/types";

export type ZoomMode = { kind: "fitWidth" } | { kind: "fitPage" } | { kind: "percent"; value: number };

export const ZOOM_STEPS = [50, 67, 75, 90, 100, 125, 150, 200, 300, 400];

export type DocState = { info: DocumentInfo; zoom: ZoomMode; currentPage: number; hasText: boolean | null };

export type DocumentsState = { order: number[]; docs: Record<number, DocState>; activeId: number | null };

export type Action =
  | { type: "opened"; info: DocumentInfo }
  | { type: "closed"; id: number }
  | { type: "activated"; id: number }
  | { type: "zoomed"; id: number; zoom: ZoomMode }
  | { type: "pageChanged"; id: number; page: number }
  | { type: "textKnown"; id: number; hasText: boolean };

export const initialState: DocumentsState = { order: [], docs: {}, activeId: null };

function updateDoc(state: DocumentsState, id: number, patch: Partial<DocState>): DocumentsState {
  const doc = state.docs[id];
  if (!doc) return state;
  return { ...state, docs: { ...state.docs, [id]: { ...doc, ...patch } } };
}

function sameZoom(a: ZoomMode, b: ZoomMode): boolean {
  return a.kind === b.kind && (a.kind !== "percent" || a.value === (b as { value: number }).value);
}

export function reducer(state: DocumentsState, action: Action): DocumentsState {
  switch (action.type) {
    case "opened": {
      const { info } = action;
      const order = state.order.includes(info.id) ? state.order : [...state.order, info.id];
      const doc: DocState = { info, zoom: { kind: "fitWidth" }, currentPage: 0, hasText: null };
      return { order, docs: { ...state.docs, [info.id]: doc }, activeId: info.id };
    }
    case "closed": {
      const index = state.order.indexOf(action.id);
      if (index < 0) return state;
      const order = state.order.filter((id) => id !== action.id);
      const docs = { ...state.docs };
      delete docs[action.id];
      // Right neighbour (now at the same index), else the left one, else nothing.
      const activeId = state.activeId === action.id ? (order[index] ?? order[index - 1] ?? null) : state.activeId;
      return { order, docs, activeId };
    }
    case "activated":
      if (!state.docs[action.id] || state.activeId === action.id) return state;
      return { ...state, activeId: action.id };
    case "zoomed": {
      const doc = state.docs[action.id];
      if (!doc || sameZoom(doc.zoom, action.zoom)) return state;
      return updateDoc(state, action.id, { zoom: action.zoom });
    }
    case "pageChanged": {
      const doc = state.docs[action.id];
      if (!doc || doc.currentPage === action.page) return state;
      const page = Math.max(0, Math.min(doc.info.page_count - 1, action.page));
      return page === doc.currentPage ? state : updateDoc(state, action.id, { currentPage: page });
    }
    case "textKnown": {
      const doc = state.docs[action.id];
      if (!doc || doc.hasText === action.hasText) return state;
      return updateDoc(state, action.id, { hasText: action.hasText });
    }
  }
}

/**
 * The next zoom step in `direction`. From a fit mode the effective percent (`fitWidthPercent`) is the
 * starting point; without a further step the zoom stays as it is.
 */
export function nextZoom(zoom: ZoomMode, direction: 1 | -1, fitWidthPercent: number): ZoomMode {
  const current = zoom.kind === "percent" ? zoom.value : fitWidthPercent;
  const step =
    direction === 1 ? ZOOM_STEPS.find((s) => s > current) : [...ZOOM_STEPS].reverse().find((s) => s < current);
  return step === undefined ? zoom : { kind: "percent", value: step };
}

interface DocumentsContextValue {
  state: DocumentsState;
  dispatch: Dispatch<Action>;
  active: DocState | null;
}

const DocumentsContext = createContext<DocumentsContextValue | null>(null);

export function DocumentsProvider({
  children,
  initial = initialState,
}: {
  children: ReactNode;
  initial?: DocumentsState;
}): JSX.Element {
  const [state, dispatch] = useReducer(reducer, initial);
  const value = useMemo(
    () => ({ state, dispatch, active: state.activeId === null ? null : (state.docs[state.activeId] ?? null) }),
    [state],
  );
  return <DocumentsContext.Provider value={value}>{children}</DocumentsContext.Provider>;
}

export function useDocuments(): DocumentsContextValue {
  const value = useContext(DocumentsContext);
  if (!value) throw new Error("useDocuments must be used inside a DocumentsProvider");
  return value;
}
