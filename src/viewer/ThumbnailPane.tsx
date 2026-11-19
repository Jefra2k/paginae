import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { DocState } from "../state/documents";
import { PageImage } from "./PageImage";
import { useRenderCaches } from "./RenderCache";

/** CSS width of every thumbnail. */
const THUMB_WIDTH = 140;

/** One column of page thumbnails; the current page is marked and kept in view. */
export function ThumbnailPane({ doc, onSelect }: { doc: DocState; onSelect(page: number): void }) {
  const { t } = useTranslation();
  const { thumbnails: cache } = useRenderCaches();
  const listRef = useRef<HTMLOListElement>(null);
  const { info, currentPage } = doc;

  useEffect(() => {
    listRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: "nearest" });
  }, [currentPage]);

  return (
    <nav className="thumbnail-pane" aria-label={t("thumbnails.title")}>
      <ol className="thumbnail-list" ref={listRef} data-scroll-root="">
        {info.pages.map((page) => {
          const n = page.index + 1;
          const current = page.index === currentPage;
          return (
            <li key={page.index}>
              <button
                type="button"
                className="thumbnail"
                data-testid="thumbnail"
                aria-current={current ? "page" : undefined}
                aria-label={t("thumbnails.page", { n })}
                onClick={() => onSelect(page.index)}
              >
                <PageImage docId={info.id} page={page} cssWidth={THUMB_WIDTH} cache={cache} />
                <span className="thumbnail-number" aria-hidden="true">
                  {n}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <p className="thumbnail-hint">{t("thumbnails.dropHint")}</p>
    </nav>
  );
}
