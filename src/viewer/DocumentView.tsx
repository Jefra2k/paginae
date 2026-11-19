import {
  createContext,
  useContext,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type Ref,
} from "react";
import { nextZoom, useDocuments, type DocState } from "../state/documents";
import { cssPageWidth, effectivePercent } from "./geometry";
import { PageImage } from "./PageImage";
import { useRenderCaches } from "./RenderCache";

/** Padding around the pages (half the 48 px gutter of `cssPageWidth`) and the gap between pages. */
const PADDING = 24;
const GAP = 16;
/** How far above a page's top edge `scrollToPage` stops. */
const SCROLL_MARGIN = 8;
/** Summed wheel delta that makes one zoom step, so a trackpad pinch does not race through all steps. */
const WHEEL_STEP = 50;

export interface DocumentViewHandle {
  scrollToPage(page: number): void;
  /** The zoom percent of the current page as shown now. */
  effectivePercent(): number;
}

/** Lets panes (thumbnails, tools, later the search) steer the visible document view. */
export const ViewerContext = createContext<DocumentViewHandle>({
  scrollToPage: () => {},
  effectivePercent: () => 100,
});

export function useViewer(): DocumentViewHandle {
  return useContext(ViewerContext);
}

interface Layout {
  widths: number[];
  tops: number[];
  heights: number[];
}

/** All pages of a document one below the other in a scrollable column. */
export function DocumentView({
  doc,
  ref,
  onPercentChange,
}: {
  doc: DocState;
  ref?: Ref<DocumentViewHandle>;
  /** Reports the effective zoom percent of the current page whenever it changes. */
  onPercentChange?: (percent: number) => void;
}) {
  const { dispatch } = useDocuments();
  const { pages: cache } = useRenderCaches();
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const { info, zoom } = doc;
  const id = info.id;

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () =>
      setViewport((v) =>
        v.width === el.clientWidth && v.height === el.clientHeight
          ? v
          : { width: el.clientWidth, height: el.clientHeight },
      );
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const layout = useMemo<Layout>(() => {
    const widths = info.pages.map((page) =>
      viewport.width > 0 ? Math.max(1, cssPageWidth(page, zoom, viewport)) : 0,
    );
    const heights = info.pages.map((page, i) => Math.round((widths[i] * page.height_pt) / page.width_pt));
    const tops: number[] = [];
    let y = PADDING;
    for (const height of heights) {
      tops.push(y);
      y += height + GAP;
    }
    return { widths, tops, heights };
  }, [info.pages, zoom, viewport]);

  // Handlers read the latest values through refs, so listeners need not be re-registered.
  const latest = useRef({ doc, layout });
  latest.current = { doc, layout };

  const percentNow = () => {
    const { doc: d, layout: l } = latest.current;
    const page = d.info.pages[d.currentPage];
    const width = l.widths[d.currentPage];
    return page && width > 0 ? effectivePercent(page, width) : 100;
  };

  const scrollToPage = (page: number) => {
    const el = containerRef.current;
    const { doc: d, layout: l } = latest.current;
    const target = Math.max(0, Math.min(d.info.page_count - 1, page));
    if (el && l.tops[target] !== undefined) el.scrollTop = Math.max(0, l.tops[target] - SCROLL_MARGIN);
    dispatch({ type: "pageChanged", id: d.info.id, page: target });
  };

  useImperativeHandle(ref, () => ({ scrollToPage, effectivePercent: percentNow }));

  const currentWidth = layout.widths[doc.currentPage] ?? 0;
  const currentPageInfo = info.pages[doc.currentPage];
  useEffect(() => {
    if (onPercentChange && currentPageInfo && currentWidth > 0) {
      onPercentChange(effectivePercent(currentPageInfo, currentWidth));
    }
  }, [onPercentChange, currentPageInfo, currentWidth]);

  // When the page size changes (zoom, window size) or the view is mounted again, keep the current page in view.
  const sizeKey = layout.widths.join(",");
  useLayoutEffect(() => {
    const el = containerRef.current;
    const { doc: d, layout: l } = latest.current;
    if (!el || l.widths[0] === 0 || d.currentPage === 0) return;
    el.scrollTop = Math.max(0, l.tops[d.currentPage] - SCROLL_MARGIN);
  }, [sizeKey]);

  const onScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const { doc: d, layout: l } = latest.current;
    let page: number;
    if (el.scrollTop <= 0) {
      page = 0;
    } else if (el.scrollHeight > el.clientHeight && el.scrollTop + el.clientHeight >= el.scrollHeight - 1) {
      page = d.info.page_count - 1; // the last page may never reach the centre
    } else {
      const centre = el.scrollTop + el.clientHeight / 2;
      page = 0;
      let best = Infinity;
      l.tops.forEach((top, i) => {
        const distance = Math.abs(top + l.heights[i] / 2 - centre);
        if (distance < best) {
          best = distance;
          page = i;
        }
      });
    }
    dispatch({ type: "pageChanged", id: d.info.id, page });
  };

  // Ctrl (Cmd) + wheel zooms. React's wheel listener is passive, so register a native one.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let accumulated = 0;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      if (e.deltaY === 0) return;
      // A change of direction starts the sum afresh.
      accumulated = Math.sign(accumulated) === Math.sign(e.deltaY) ? accumulated + e.deltaY : e.deltaY;
      if (Math.abs(accumulated) < WHEEL_STEP) return;
      const direction = accumulated < 0 ? 1 : -1;
      accumulated = 0;
      const d = latest.current.doc;
      dispatch({ type: "zoomed", id: d.info.id, zoom: nextZoom(d.zoom, direction, percentNow()) });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [dispatch]); // everything else is read through `latest`

  return (
    <div
      ref={containerRef}
      className="document-view"
      data-testid="document-view"
      data-scroll-root=""
      tabIndex={-1}
      onScroll={onScroll}
    >
      <div className="document-pages" style={{ padding: `${PADDING}px`, gap: `${GAP}px` }}>
        {info.pages.map((page, i) => (
          <PageImage key={page.index} docId={id} page={page} cssWidth={layout.widths[i]} cache={cache} />
        ))}
      </div>
    </div>
  );
}
