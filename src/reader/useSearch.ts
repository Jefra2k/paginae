import { useCallback, useEffect, useRef, useState } from "react";
import { useBackend } from "../backend/BackendContext";
import type { SearchHit } from "../backend/types";

export type SearchStatus = "idle" | "searching" | "done";

export interface SearchApi {
  query: string;
  setQuery(query: string): void;
  run(): Promise<void>;
  hits: SearchHit[];
  /** Index into `hits` of the hit that is highlighted as the current one. */
  current: number;
  next(): void;
  prev(): void;
  /** Makes the hit at `index` the current one and shows its page. */
  select(index: number): void;
  clear(): void;
  status: SearchStatus;
}

interface State {
  docId: number | null;
  query: string;
  hits: SearchHit[];
  current: number;
  status: SearchStatus;
}

const empty = (docId: number | null): State => ({
  docId,
  query: "",
  hits: [],
  current: 0,
  status: "idle",
});

/**
 * Search state of the active document; a change of document starts afresh. `scrollToPage` shows the page
 * of the first hit after a run and of the current hit when stepping.
 */
export function useSearch(docId: number | null, scrollToPage: (page: number) => void): SearchApi {
  const backend = useBackend();
  const [stored, setStored] = useState<State>(() => empty(docId));
  const state = stored.docId === docId ? stored : empty(docId);

  // Handlers read the latest state through a ref, so key handlers outside React stay current.
  const latest = useRef({ state, scrollToPage });
  latest.current = { state, scrollToPage };
  // A newer run (or a clear) makes an older answer obsolete.
  const generation = useRef(0);

  useEffect(() => {
    generation.current++;
  }, [docId]);

  const patch = useCallback(
    (change: Partial<State>) => setStored({ ...latest.current.state, docId, ...change }),
    [docId],
  );

  const setQuery = useCallback((query: string) => patch({ query }), [patch]);

  const clear = useCallback(() => {
    generation.current++;
    setStored(empty(docId));
  }, [docId]);

  const run = useCallback(async () => {
    const { query } = latest.current.state;
    if (docId === null) return;
    if (query.trim() === "") {
      clear();
      return;
    }
    const mine = ++generation.current;
    patch({ status: "searching" });
    let hits: SearchHit[];
    try {
      hits = await backend.search(docId, query);
    } catch {
      hits = [];
    }
    if (mine !== generation.current) return;
    setStored({ docId, query, hits, current: 0, status: "done" });
    if (hits.length > 0) latest.current.scrollToPage(hits[0].page_index);
  }, [backend, clear, docId, patch]);

  const select = useCallback(
    (index: number) => {
      const { hits } = latest.current.state;
      if (hits.length === 0) return;
      const target = ((index % hits.length) + hits.length) % hits.length;
      patch({ current: target });
      latest.current.scrollToPage(hits[target].page_index);
    },
    [patch],
  );

  const next = useCallback(() => select(latest.current.state.current + 1), [select]);
  const prev = useCallback(() => select(latest.current.state.current - 1), [select]);

  return {
    query: state.query,
    setQuery,
    run,
    hits: state.hits,
    current: state.current,
    next,
    prev,
    select,
    clear,
    status: state.status,
  };
}
