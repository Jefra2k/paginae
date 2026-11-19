import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";
import { BackendProvider } from "../backend/BackendContext";
import { FakeBackend } from "../backend/fakeBackend";
import de from "../i18n/de.json";
import { initI18n } from "../i18n";
import type { DocState } from "../state/documents";
import { createRenderCaches, RenderCachesContext } from "./RenderCache";
import { ThumbnailPane } from "./ThumbnailPane";

beforeEach(() => {
  initI18n("de");
});

async function setup(currentPage: number) {
  const fake = new FakeBackend({ "/a.pdf": { page_count: 3 } });
  const info = await fake.openDocument("/a.pdf");
  const doc: DocState = { info, zoom: { kind: "fitWidth" }, currentPage, hasText: null };
  const onSelect = vi.fn();
  render(
    <BackendProvider backend={fake}>
      <RenderCachesContext.Provider value={createRenderCaches(fake)}>
        <ThumbnailPane doc={doc} onSelect={onSelect} />
      </RenderCachesContext.Provider>
    </BackendProvider>,
  );
  await screen.findAllByTestId("page-image");
  return { fake, onSelect };
}

test("shows one thumbnail per page, rendered 140 px wide", async () => {
  const { fake } = await setup(0);
  expect(screen.getAllByTestId("thumbnail")).toHaveLength(3);
  expect(fake.calls).toContain(`render:1:0:${Math.round(140 * window.devicePixelRatio)}`);
  expect(screen.getByText(de.thumbnails.dropHint)).toBeInTheDocument();
});

test("the current page is marked", async () => {
  await setup(1);
  const thumbnails = screen.getAllByTestId("thumbnail");
  expect(thumbnails[1]).toHaveAttribute("aria-current", "page");
  expect(thumbnails[0]).not.toHaveAttribute("aria-current");
  expect(thumbnails[1]).toHaveTextContent("2");
});

test("clicking the third thumbnail selects page index 2", async () => {
  const { onSelect } = await setup(0);
  await userEvent.click(screen.getAllByTestId("thumbnail")[2]);
  expect(onSelect).toHaveBeenCalledWith(2);
});
