import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { isCommandError, type CommandError, type PageInfo } from "../backend/types";
import { errorText, toCommandError } from "../i18n/errorText";
import { renderWidthFor } from "./geometry";
import type { RenderCache } from "./RenderCache";

export interface PageImageProps {
  docId: number;
  page: PageInfo;
  cssWidth: number;
  cache: RenderCache;
  onVisible?: (pageIndex: number) => void;
  children?: ReactNode;
}

/** A page-sized sheet (a block `span`, so it may sit inside a button) that loads its bitmap only while it is (nearly) visible. */
export function PageImage({ docId, page, cssWidth, cache, onVisible, children }: PageImageProps) {
  const { t } = useTranslation();
  const sheetRef = useRef<HTMLSpanElement>(null);
  const onVisibleRef = useRef(onVisible);
  onVisibleRef.current = onVisible;
  const [visible, setVisible] = useState(false);
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState<CommandError | null>(null);

  const width = Math.round(cssWidth);
  const height = Math.round((cssWidth * page.height_pt) / page.width_pt);
  const renderWidth = cssWidth > 0 ? renderWidthFor(cssWidth, window.devicePixelRatio || 1) : 0;

  useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    const root = sheet.closest("[data-scroll-root]");
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          setVisible(entry.isIntersecting);
          if (entry.isIntersecting) onVisibleRef.current?.(page.index);
        }
      },
      { root, rootMargin: "600px" },
    );
    observer.observe(sheet);
    return () => observer.disconnect();
  }, [page.index]);

  useEffect(() => {
    if (!visible || renderWidth < 1) return;
    let current = true;
    cache.get(docId, page.index, renderWidth).then(
      (url) => {
        if (!current) return;
        setSrc(url);
        setFailed(null);
      },
      (error: unknown) => {
        // A document closed while rendering is not an error worth showing.
        if (!current || (isCommandError(error) && error.kind === "unknown_document")) return;
        setFailed(toCommandError(error));
      },
    );
    return () => {
      current = false;
    };
  }, [visible, cache, docId, page.index, renderWidth]);

  return (
    <span
      ref={sheetRef}
      className="page-sheet"
      data-testid="page-placeholder"
      data-error={failed?.kind}
      style={{ width: `${width}px`, height: `${height}px` }}
    >
      {src && (
        <img
          className="page-image"
          data-testid="page-image"
          src={src}
          alt={t("thumbnails.page", { n: page.index + 1 })}
          draggable={false}
        />
      )}
      {failed && !src && <span className="page-error">{errorText(t, failed)}</span>}
      {children}
    </span>
  );
}
