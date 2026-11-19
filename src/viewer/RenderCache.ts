import { createContext, useContext } from "react";
import type { Backend } from "../backend/Backend";
import type { CommandError } from "../backend/types";

/**
 * Rendered page bitmaps as object URLs, keyed by document, page and width.
 * Least recently used entries are evicted (Map order) and their URLs revoked; concurrent requests for
 * the same key share one backend call; results for a document invalidated meanwhile are discarded.
 */
export class RenderCache {
  private readonly entries = new Map<string, string>();
  private readonly pending = new Map<string, Promise<string>>();
  /** Bumped by `invalidate`, so a render started before can tell it is stale. */
  private readonly generations = new Map<number, number>();
  private epoch = 0;

  constructor(
    private readonly backend: Backend,
    private readonly max = 60,
  ) {}

  get(id: number, pageIndex: number, widthPx: number): Promise<string> {
    const key = `${id}:${pageIndex}:${widthPx}`;
    const cached = this.entries.get(key);
    if (cached !== undefined) {
      this.entries.delete(key);
      this.entries.set(key, cached);
      return Promise.resolve(cached);
    }
    const running = this.pending.get(key);
    if (running) return running;

    const generation = this.generation(id);
    const epoch = this.epoch;
    const request = this.backend.renderPage(id, pageIndex, widthPx).then(
      (blob) => {
        this.settle(key, request);
        if (this.generation(id) !== generation || this.epoch !== epoch) throw staleDocument(id);
        const url = URL.createObjectURL(blob);
        this.store(key, url);
        return url;
      },
      (error: unknown) => {
        this.settle(key, request);
        throw error;
      },
    );
    this.pending.set(key, request);
    return request;
  }

  /** Forgets every bitmap of a document and revokes their URLs; renders still running are discarded. */
  invalidate(id: number): void {
    this.generations.set(id, this.generation(id) + 1);
    const prefix = `${id}:`;
    for (const [key, url] of this.entries) {
      if (key.startsWith(prefix)) {
        URL.revokeObjectURL(url);
        this.entries.delete(key);
      }
    }
    for (const key of this.pending.keys()) {
      if (key.startsWith(prefix)) this.pending.delete(key);
    }
  }

  /** Revokes every URL. The cache stays usable (StrictMode runs cleanups and then the effect again). */
  dispose(): void {
    this.epoch++;
    for (const url of this.entries.values()) URL.revokeObjectURL(url);
    this.entries.clear();
    this.pending.clear();
  }

  private generation(id: number): number {
    return this.generations.get(id) ?? 0;
  }

  private settle(key: string, request: Promise<string>): void {
    if (this.pending.get(key) === request) this.pending.delete(key);
  }

  private store(key: string, url: string): void {
    this.entries.set(key, url);
    while (this.entries.size > this.max) {
      const [oldestKey, oldestUrl] = this.entries.entries().next().value as [string, string];
      URL.revokeObjectURL(oldestUrl);
      this.entries.delete(oldestKey);
    }
  }
}

function staleDocument(id: number): CommandError {
  return { kind: "unknown_document", message: `document ${id} was closed while rendering` };
}

export interface RenderCaches {
  pages: RenderCache;
  thumbnails: RenderCache;
}

export function createRenderCaches(backend: Backend): RenderCaches {
  return { pages: new RenderCache(backend, 60), thumbnails: new RenderCache(backend, 200) };
}

export const RenderCachesContext = createContext<RenderCaches | null>(null);

export function useRenderCaches(): RenderCaches {
  const caches = useContext(RenderCachesContext);
  if (!caches) throw new Error("useRenderCaches must be used inside RenderCachesContext");
  return caches;
}
