import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Backend } from "../backend/Backend";
import type { CommandError } from "../backend/types";
import { errorText, toCommandError } from "../i18n/errorText";
import { renderWidthFor } from "../viewer/geometry";

/** Print resolution of the raster pages. */
const PRINT_DPI = 300;

interface PrintPage {
  url: string;
  index: number;
}

/**
 * The content of the print window: every page as a 300 dpi bitmap, one per sheet. Once the last image has
 * loaded it asks the shell to open the system print dialog (`printWindowReady`), exactly once.
 */
export function PrintView({ backend, docId, onClose }: { backend: Backend; docId: number; onClose?: () => void }) {
  const { t } = useTranslation();
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState<PrintPage[]>([]);
  const [loaded, setLoaded] = useState(0);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState<CommandError | null>(null);
  const printRequested = useRef(false);

  useEffect(() => {
    let current = true;
    const urls: string[] = [];
    setTotal(0);
    setPages([]);
    setLoaded(0);
    setReady(false);
    setFailed(null);
    printRequested.current = false;
    (async () => {
      const info = await backend.documentInfo(docId);
      if (!current) return;
      setTotal(info.page_count);
      // One page at a time keeps the memory in check.
      for (const page of info.pages) {
        const blob = await backend.renderPage(
          docId,
          page.index,
          renderWidthFor((page.width_pt / 72) * PRINT_DPI, 1),
        );
        if (!current) return;
        const url = URL.createObjectURL(blob);
        urls.push(url);
        setPages((previous) => [...previous, { url, index: page.index }]);
      }
    })().catch((error: unknown) => {
      if (current) setFailed(toCommandError(error));
    });
    return () => {
      current = false;
      for (const url of urls) URL.revokeObjectURL(url);
    };
  }, [backend, docId]);

  const allLoaded = total > 0 && pages.length === total && loaded === total;
  useEffect(() => {
    if (!allLoaded || printRequested.current) return;
    printRequested.current = true;
    backend.printWindowReady().then(
      () => setReady(true),
      (error: unknown) => setFailed(toCommandError(error)),
    );
  }, [allLoaded, backend]);

  return (
    <main className="print-view">
      <div className="print-status">
        {failed ? (
          <p role="alert">{errorText(t, failed)}</p>
        ) : (
          <p role="status">{ready ? t("print.ready") : t("print.preparing", { done: pages.length, total })}</p>
        )}
        <button type="button" className="print-close" onClick={onClose}>
          {t("actions.close")}
        </button>
      </div>
      {pages.map((page) => (
        <div key={page.index} className="print-sheet" data-testid="print-sheet">
          <img
            className="print-page"
            data-testid="print-page"
            src={page.url}
            alt={t("thumbnails.page", { n: page.index + 1 })}
            onLoad={() => setLoaded((n) => n + 1)}
          />
        </div>
      ))}
    </main>
  );
}
