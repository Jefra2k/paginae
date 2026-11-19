import type { PageInfo, SearchHit } from "../backend/types";
import { rectPtToCss } from "./geometry";

export interface HitOverlayProps {
  /** All hits of the document; the overlay draws those on `page`. */
  hits: SearchHit[];
  page: PageInfo;
  cssWidth: number;
  /** The index (as text) into `hits` of the current hit. */
  currentKey?: string;
}

/** Highlights the search hits of one page: a layer above the bitmap that takes no pointer events. */
export function HitOverlay({ hits, page, cssWidth, currentKey }: HitOverlayProps) {
  return (
    <span className="hit-overlay" aria-hidden="true">
      {hits.flatMap((hit, index) => {
        if (hit.page_index !== page.index) return [];
        const current = String(index) === currentKey;
        return hit.rects.map((rect, i) => {
          const box = rectPtToCss(rect, page, cssWidth);
          return (
            <span
              key={`${index}-${i}`}
              className={current ? "hit current" : "hit"}
              data-testid="hit"
              style={{
                left: `${box.left}px`,
                top: `${box.top}px`,
                width: `${box.width}px`,
                height: `${box.height}px`,
              }}
            />
          );
        });
      })}
    </span>
  );
}
