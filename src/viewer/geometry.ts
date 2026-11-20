// The single place where PDF points become CSS pixels.
import type { PageInfo, RectPt } from "../backend/types";
import type { ZoomMode } from "../state/documents";

/** CSS pixels per PDF point at 100 % (96 dpi screen, 72 points per inch). */
export const PX_PER_PT = 96 / 72;

/** Largest bitmap width requested from the core. */
const MAX_RENDER_WIDTH = 8000;

/** CSS width of a page for a zoom mode; `gutter` is the horizontal (and, for fitPage, vertical) margin. */
export function cssPageWidth(
  page: PageInfo,
  zoom: ZoomMode,
  viewport: { width: number; height: number },
  gutter = 48,
): number {
  switch (zoom.kind) {
    case "fitWidth":
      return viewport.width - gutter;
    case "fitPage":
      return Math.min(viewport.width - gutter, ((viewport.height - gutter) * page.width_pt) / page.height_pt);
    case "percent":
      return (page.width_pt * PX_PER_PT * zoom.value) / 100;
  }
}

/** The zoom percent a page shown `cssWidth` pixels wide corresponds to. */
export function effectivePercent(page: PageInfo, cssWidth: number): number {
  return (cssWidth / (page.width_pt * PX_PER_PT)) * 100;
}

/** Bitmap width in device pixels for a page shown `cssWidth` CSS pixels wide. */
export function renderWidthFor(cssWidth: number, devicePixelRatio: number): number {
  return Math.min(MAX_RENDER_WIDTH, Math.round(cssWidth * devicePixelRatio));
}

/**
 * Converts a rectangle in unrotated page space (points, origin bottom-left) to CSS pixels relative to
 * the top-left corner of the displayed (rotated) page.
 */
export function rectPtToCss(
  rect: RectPt,
  page: PageInfo,
  cssWidth: number,
): { left: number; top: number; width: number; height: number } {
  const rotation = ((page.rotation % 360) + 360) % 360;
  const quarter = rotation === 90 || rotation === 270;
  const w0 = quarter ? page.height_pt : page.width_pt;
  const h0 = quarter ? page.width_pt : page.height_pt;

  const toDisplay = (x: number, y: number): [number, number] => {
    switch (rotation) {
      case 90:
        return [y, x];
      case 180:
        return [w0 - x, y];
      case 270:
        return [h0 - y, w0 - x];
      default:
        return [x, h0 - y];
    }
  };

  const corners = [
    toDisplay(rect.left, rect.bottom),
    toDisplay(rect.right, rect.bottom),
    toDisplay(rect.left, rect.top),
    toDisplay(rect.right, rect.top),
  ];
  const xs = corners.map(([x]) => x);
  const ys = corners.map(([, y]) => y);
  const scale = cssWidth / page.width_pt;
  const left = Math.min(...xs);
  const top = Math.min(...ys);
  return {
    left: left * scale,
    top: top * scale,
    width: (Math.max(...xs) - left) * scale,
    height: (Math.max(...ys) - top) * scale,
  };
}

/** Bitmap widths requested for the screen are multiples of this; CSS scales the remainder. */
export const RENDER_WIDTH_STEP = 64;

/** Rounds a bitmap width up to the next multiple of 64 (never blurrier than asked), capped at 8000 (itself a multiple). */
export function quantizeRenderWidth(renderWidth: number): number {
  return Math.min(MAX_RENDER_WIDTH, Math.ceil(renderWidth / RENDER_WIDTH_STEP) * RENDER_WIDTH_STEP);
}

/**
 * Wraps `commit` so the first call goes through at once (the initial measurement must not wait) and later
 * calls are collapsed into one trailing call `delayMs` after the last of them. `cancel` drops a pending call.
 */
export function leadingDebounce<A extends unknown[]>(commit: (...args: A) => void, delayMs: number) {
  let first = true;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const call = (...args: A) => {
    if (first) {
      first = false;
      commit(...args);
      return;
    }
    clearTimeout(timer);
    timer = setTimeout(() => commit(...args), delayMs);
  };
  call.cancel = () => clearTimeout(timer);
  return call;
}
