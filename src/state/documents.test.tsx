import { expect, test } from "vitest";
import type { DocumentInfo } from "../backend/types";
import { initialState, nextZoom, reducer, type DocumentsState } from "./documents";

function info(id: number, pageCount = 5): DocumentInfo {
  return {
    id,
    path: `/doc-${id}.pdf`,
    file_name: `doc-${id}.pdf`,
    title: null,
    page_count: pageCount,
    pages: Array.from({ length: pageCount }, (_, index) => ({ index, width_pt: 595.3, height_pt: 841.9, rotation: 0 })),
    form: "none",
    permissions: { print: true, modify: true, copy: true, annotate: true, fill_forms: true, assemble: true },
    encrypted: false,
  };
}

function openAll(...ids: number[]): DocumentsState {
  return ids.reduce((state, id) => reducer(state, { type: "opened", info: info(id) }), initialState);
}

test("opened twice appends both and activates the second", () => {
  const state = openAll(1, 2);
  expect(state.order).toEqual([1, 2]);
  expect(state.activeId).toBe(2);
  expect(state.docs[1].zoom).toEqual({ kind: "fitWidth" });
  expect(state.docs[1].currentPage).toBe(0);
  expect(state.docs[1].hasText).toBeNull();
});

test("closing the last of two activates its left neighbour", () => {
  const state = reducer(openAll(1, 2), { type: "closed", id: 2 });
  expect(state.order).toEqual([1]);
  expect(state.activeId).toBe(1);
  expect(state.docs[2]).toBeUndefined();
});

test("closing the active middle document of three activates the right neighbour", () => {
  let state = openAll(1, 2, 3);
  state = reducer(state, { type: "activated", id: 2 });
  state = reducer(state, { type: "closed", id: 2 });
  expect(state.order).toEqual([1, 3]);
  expect(state.activeId).toBe(3);
});

test("closing the only document leaves nothing active", () => {
  const state = reducer(openAll(1), { type: "closed", id: 1 });
  expect(state.order).toEqual([]);
  expect(state.activeId).toBeNull();
});

test("closing an inactive document keeps the active one", () => {
  const state = reducer(openAll(1, 2, 3), { type: "closed", id: 1 });
  expect(state.activeId).toBe(3);
});

test("zoomed for an unknown id leaves the state referentially equal", () => {
  const state = openAll(1);
  expect(reducer(state, { type: "zoomed", id: 99, zoom: { kind: "fitPage" } })).toBe(state);
  expect(reducer(state, { type: "pageChanged", id: 99, page: 3 })).toBe(state);
  expect(reducer(state, { type: "textKnown", id: 99, hasText: true })).toBe(state);
});

test("zoomed, pageChanged and textKnown update a known document", () => {
  let state = openAll(1);
  state = reducer(state, { type: "zoomed", id: 1, zoom: { kind: "percent", value: 150 } });
  state = reducer(state, { type: "pageChanged", id: 1, page: 4 });
  state = reducer(state, { type: "textKnown", id: 1, hasText: false });
  expect(state.docs[1]).toMatchObject({ zoom: { kind: "percent", value: 150 }, currentPage: 4, hasText: false });
});

test("pageChanged is clamped to the pages of the document", () => {
  const state = reducer(openAll(1), { type: "pageChanged", id: 1, page: 9 });
  expect(state.docs[1].currentPage).toBe(4);
});

test("nextZoom from fitWidth rounds the effective percent up to the next step", () => {
  expect(nextZoom({ kind: "fitWidth" }, 1, 83)).toEqual({ kind: "percent", value: 90 });
  expect(nextZoom({ kind: "fitPage" }, -1, 83)).toEqual({ kind: "percent", value: 75 });
});

test("nextZoom stays at 400 when zooming in beyond the last step", () => {
  expect(nextZoom({ kind: "percent", value: 400 }, 1, 0)).toEqual({ kind: "percent", value: 400 });
  expect(nextZoom({ kind: "percent", value: 100 }, 1, 0)).toEqual({ kind: "percent", value: 125 });
  expect(nextZoom({ kind: "percent", value: 50 }, -1, 0)).toEqual({ kind: "percent", value: 50 });
});
