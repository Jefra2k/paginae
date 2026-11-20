import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Dispatch } from "react";
import { afterEach, beforeEach, expect, test } from "vitest";
import { BackendProvider } from "../backend/BackendContext";
import { FakeBackend } from "../backend/fakeBackend";
import de from "../i18n/de.json";
import type { PageInfo } from "../backend/types";
import { initI18n } from "../i18n";
import { DocumentsProvider, initialState, reducer, useDocuments, type Action } from "../state/documents";
import { DocumentView } from "./DocumentView";
import { quantizeRenderWidth } from "./geometry";
import { createRenderCaches, RenderCachesContext } from "./RenderCache";

const A4 = { width_pt: 595.3, height_pt: 841.9, rotation: 0 };
const PAGES: PageInfo[] = [0, 1, 2].map((index) => ({ index, ...A4 }));

const descriptors = {
  clientWidth: Object.getOwnPropertyDescriptor(HTMLElement.prototype, "clientWidth"),
  clientHeight: Object.getOwnPropertyDescriptor(HTMLElement.prototype, "clientHeight"),
};

// jsdom has no layout: the document view measures 1048 x 800, everything else 0.
beforeEach(() => {
  initI18n("de");
  Object.defineProperty(HTMLElement.prototype, "clientWidth", {
    configurable: true,
    get(this: HTMLElement) {
      return this.dataset.testid === "document-view" ? 1048 : 0;
    },
  });
  Object.defineProperty(HTMLElement.prototype, "clientHeight", {
    configurable: true,
    get(this: HTMLElement) {
      return this.dataset.testid === "document-view" ? 800 : 0;
    },
  });
});

afterEach(() => {
  for (const [name, descriptor] of Object.entries(descriptors)) {
    if (descriptor) Object.defineProperty(HTMLElement.prototype, name, descriptor);
  }
});

/** Every render fails in the PDF engine. */
class BrokenRenderer extends FakeBackend {
  override async renderPage(id: number, pageIndex: number, widthPx: number): Promise<Blob> {
    this.calls.push(`render:${id}:${pageIndex}:${widthPx}`);
    throw { kind: "engine", message: "broken page" };
  }
}

async function setup({ closeFirst = false, broken = false } = {}) {
  const fixtures = { "/a.pdf": { page_count: 3, pages: PAGES } };
  const fake = broken ? new BrokenRenderer(fixtures) : new FakeBackend(fixtures);
  const info = await fake.openDocument("/a.pdf");
  if (closeFirst) await fake.closeDocument(info.id);
  const handle: { dispatch: Dispatch<Action> | null } = { dispatch: null };

  function View() {
    const { dispatch, active } = useDocuments();
    handle.dispatch = dispatch;
    if (!active) return null;
    return (
      <>
        <span data-testid="current-page">{active.currentPage}</span>
        <DocumentView doc={active} />
      </>
    );
  }

  render(
    <BackendProvider backend={fake}>
      <RenderCachesContext.Provider value={createRenderCaches(fake)}>
        <DocumentsProvider initial={reducer(initialState, { type: "opened", info })}>
          <View />
        </DocumentsProvider>
      </RenderCachesContext.Provider>
    </BackendProvider>,
  );
  return { fake, dispatch: (action: Action) => act(() => handle.dispatch?.(action)) };
}

test("renders one correctly sized placeholder per page at fit width", async () => {
  await setup();
  const placeholders = screen.getAllByTestId("page-placeholder");
  expect(placeholders).toHaveLength(3);
  for (const placeholder of placeholders) {
    expect(placeholder.style.width).toBe("1000px");
    expect(placeholder.style.height).toBe(`${Math.round((1000 * 841.9) / 595.3)}px`);
  }
  await screen.findAllByTestId("page-image");
});

test("loads every page as a blob image", async () => {
  const { fake } = await setup();
  const images = await screen.findAllByTestId("page-image");
  expect(images).toHaveLength(3);
  for (const image of images) expect(image.getAttribute("src")).toMatch(/^blob:/);
  expect(images[0]).toHaveAttribute("alt", "Seite 1");
  expect(images[0]).toHaveAttribute("draggable", "false");
  expect(fake.calls).toContain("render:1:0:1024");
});

test("zooming to 200 percent requests the matching render width", async () => {
  const { fake, dispatch } = await setup();
  await screen.findAllByTestId("page-image");
  dispatch({ type: "zoomed", id: 1, zoom: { kind: "percent", value: 200 } });
  const width = quantizeRenderWidth(Math.round(((595.3 * 96) / 72) * 2 * window.devicePixelRatio));
  await waitFor(() => expect(fake.calls).toContain(`render:1:0:${width}`));
  expect(screen.getAllByTestId("page-placeholder")[0].style.width).toBe(`${Math.round((595.3 * 96) / 72 * 2)}px`);
});

test("ctrl and the mouse wheel zoom in to the next step", async () => {
  const { fake } = await setup();
  await screen.findAllByTestId("page-image");
  // fit width is 1000 px = 126 %, the next step up is 150 %.
  fireEvent.wheel(screen.getByTestId("document-view"), { deltaY: -100, ctrlKey: true });
  const width = quantizeRenderWidth(Math.round(((595.3 * 96) / 72) * 1.5 * window.devicePixelRatio));
  await waitFor(() => expect(fake.calls).toContain(`render:1:0:${width}`));
});

test("small ctrl+wheel deltas add up before the zoom steps", async () => {
  const { fake } = await setup();
  await screen.findAllByTestId("page-image");
  const view = screen.getByTestId("document-view");
  const width = quantizeRenderWidth(Math.round(((595.3 * 96) / 72) * 1.5 * window.devicePixelRatio));
  fireEvent.wheel(view, { deltaY: -20, ctrlKey: true });
  fireEvent.wheel(view, { deltaY: -20, ctrlKey: true });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  expect(fake.calls).not.toContain(`render:1:0:${width}`);
  fireEvent.wheel(view, { deltaY: -20, ctrlKey: true }); // 60 in all: one step, to 150 %
  await waitFor(() => expect(fake.calls).toContain(`render:1:0:${width}`));
  // A second step would be 200 %; the sum starts again from zero.
  expect(fake.calls.some((c) => c.endsWith(`:${quantizeRenderWidth(Math.round(((595.3 * 96) / 72) * 2 * window.devicePixelRatio))}`))).toBe(
    false,
  );
});

test("a render error shows its text on the page", async () => {
  await setup({ broken: true });
  const messages = await screen.findAllByText(de.errors.engine);
  expect(messages).toHaveLength(3);
  expect(screen.queryAllByTestId("page-image")).toHaveLength(0);
});

test("scrolling reports the page whose centre is nearest the viewport centre", async () => {
  await setup();
  await screen.findAllByTestId("page-image");
  const view = screen.getByTestId("document-view");
  const pageHeight = Math.round((1000 * 841.9) / 595.3);
  // Second page starts at 24 (padding) + height + 16 (gap).
  view.scrollTop = 24 + pageHeight + 16;
  fireEvent.scroll(view);
  expect(screen.getByTestId("current-page")).toHaveTextContent("1");
  view.scrollTop = 0;
  fireEvent.scroll(view);
  expect(screen.getByTestId("current-page")).toHaveTextContent("0");
});

test("a render for a closed document fails quietly", async () => {
  const { fake } = await setup({ closeFirst: true });
  await waitFor(() => expect(fake.calls).toContain("render:1:2:1024"));
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  expect(screen.queryAllByTestId("page-image")).toHaveLength(0);
  expect(screen.queryByRole("alert")).toBeNull();
  expect(screen.getAllByTestId("page-placeholder")).toHaveLength(3);
});
