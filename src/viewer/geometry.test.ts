import { expect, test } from "vitest";
import type { PageInfo, RectPt } from "../backend/types";
import { cssPageWidth, effectivePercent, PX_PER_PT, rectPtToCss, renderWidthFor } from "./geometry";

const A4: PageInfo = { index: 0, width_pt: 595.3, height_pt: 841.9, rotation: 0 };
const VIEWPORT = { width: 1048, height: 800 };
const RECT: RectPt = { left: 72, bottom: 750, right: 172, top: 764 };

function expectRect(actual: ReturnType<typeof rectPtToCss>, expected: Partial<ReturnType<typeof rectPtToCss>>) {
  for (const [key, value] of Object.entries(expected)) {
    expect(actual[key as keyof typeof actual], key).toBeCloseTo(value, 1);
  }
}

test("fitWidth fills the viewport minus the gutter", () => {
  expect(cssPageWidth(A4, { kind: "fitWidth" }, VIEWPORT)).toBe(1000);
});

test("fitPage fits the whole page height", () => {
  expect(cssPageWidth(A4, { kind: "fitPage" }, VIEWPORT)).toBeCloseTo(((800 - 48) * 595.3) / 841.9, 1);
  expect(cssPageWidth(A4, { kind: "fitPage" }, VIEWPORT)).toBeCloseTo(531.7, 1);
});

test("percent 100 is the page width in points at 96 dpi", () => {
  expect(cssPageWidth(A4, { kind: "percent", value: 100 }, VIEWPORT)).toBeCloseTo((595.3 * 96) / 72, 1);
  expect(cssPageWidth(A4, { kind: "percent", value: 100 }, VIEWPORT)).toBeCloseTo(793.7, 1);
});

test("effectivePercent inverts percent zoom", () => {
  expect(effectivePercent(A4, 595.3 * PX_PER_PT * 1.5)).toBeCloseTo(150, 5);
});

test("renderWidthFor scales by the device pixel ratio and caps at 8000", () => {
  expect(renderWidthFor(1000, 2)).toBe(2000);
  expect(renderWidthFor(5000, 2)).toBe(8000);
});

test("rectPtToCss on an upright page flips the y axis", () => {
  expectRect(rectPtToCss(RECT, A4, 595.3), { left: 72, top: 841.9 - 764, width: 100, height: 14 });
});

test("rectPtToCss on a page rotated by 90 degrees", () => {
  const page: PageInfo = { index: 0, width_pt: 841.9, height_pt: 595.3, rotation: 90 };
  expectRect(rectPtToCss(RECT, page, 841.9), { left: 750, top: 72, width: 14, height: 100 });
});

test("rectPtToCss on a page rotated by 180 degrees", () => {
  const page: PageInfo = { index: 0, width_pt: 595.3, height_pt: 841.9, rotation: 180 };
  expectRect(rectPtToCss(RECT, page, 595.3), { left: 595.3 - 172, top: 750, width: 100, height: 14 });
});

test("rectPtToCss on a page rotated by 270 degrees", () => {
  const page: PageInfo = { index: 0, width_pt: 841.9, height_pt: 595.3, rotation: 270 };
  expectRect(rectPtToCss(RECT, page, 841.9), { left: 841.9 - 764, top: 595.3 - 172, width: 14, height: 100 });
});

test("rectPtToCss scales by cssWidth over the page width", () => {
  expectRect(rectPtToCss(RECT, A4, 595.3 * 2), { left: 144, top: (841.9 - 764) * 2, width: 200, height: 28 });
});
