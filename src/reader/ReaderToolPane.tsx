import { ChevronDown, ChevronUp, Maximize, MoveHorizontal, ZoomIn, ZoomOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import { nextZoom, useDocuments, type DocState, type ZoomMode } from "../state/documents";
import { useViewer } from "../viewer/DocumentView";

/** Tools of the reading mode. This stage: zoom and page navigation; search and bookmarks follow. */
export function ReaderToolPane({ doc, fitPercent = null }: { doc: DocState; fitPercent?: number | null }) {
  const { t } = useTranslation();
  const { dispatch } = useDocuments();
  const viewer = useViewer();
  const { info, zoom, currentPage } = doc;
  const setZoom = (next: ZoomMode) => dispatch({ type: "zoomed", id: info.id, zoom: next });
  const percent = zoom.kind === "percent" ? zoom.value : fitPercent === null ? null : Math.round(fitPercent);
  const step = (direction: 1 | -1) => setZoom(nextZoom(zoom, direction, viewer.effectivePercent()));

  return (
    <div className="reader-tools">
      <section className="tool-section" aria-labelledby="reader-zoom-title">
        <h2 id="reader-zoom-title">{t("reader.zoom")}</h2>
        <div className="tool-row">
          <button
            type="button"
            className="icon-button"
            data-testid="zoom-out"
            aria-label={t("reader.zoomOut")}
            title={t("reader.zoomOut")}
            onClick={() => step(-1)}
          >
            <ZoomOut size={18} aria-hidden="true" />
          </button>
          <output className="zoom-value" data-testid="zoom-value">
            {percent === null ? "" : t("reader.percent", { n: percent })}
          </output>
          <button
            type="button"
            className="icon-button"
            data-testid="zoom-in"
            aria-label={t("reader.zoomIn")}
            title={t("reader.zoomIn")}
            onClick={() => step(1)}
          >
            <ZoomIn size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="tool-row">
          <button
            type="button"
            className="tool-button"
            aria-pressed={zoom.kind === "fitWidth"}
            onClick={() => setZoom({ kind: "fitWidth" })}
          >
            <MoveHorizontal size={16} aria-hidden="true" />
            <span>{t("reader.fitWidth")}</span>
          </button>
          <button
            type="button"
            className="tool-button"
            aria-pressed={zoom.kind === "fitPage"}
            onClick={() => setZoom({ kind: "fitPage" })}
          >
            <Maximize size={16} aria-hidden="true" />
            <span>{t("reader.fitPage")}</span>
          </button>
        </div>
        <div className="tool-row">
          <button
            type="button"
            className="icon-button"
            aria-label={t("reader.prevPage")}
            title={t("reader.prevPage")}
            disabled={currentPage === 0}
            onClick={() => viewer.scrollToPage(currentPage - 1)}
          >
            <ChevronUp size={18} aria-hidden="true" />
          </button>
          <span className="page-of" data-testid="page-of">
            {t("reader.pageOf", { n: currentPage + 1, total: info.page_count })}
          </span>
          <button
            type="button"
            className="icon-button"
            aria-label={t("reader.nextPage")}
            title={t("reader.nextPage")}
            disabled={currentPage >= info.page_count - 1}
            onClick={() => viewer.scrollToPage(currentPage + 1)}
          >
            <ChevronDown size={18} aria-hidden="true" />
          </button>
        </div>
      </section>
    </div>
  );
}
