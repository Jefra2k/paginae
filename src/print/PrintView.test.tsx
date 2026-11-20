import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { FakeBackend } from "../backend/fakeBackend";
import type { PageInfo } from "../backend/types";
import { initI18n } from "../i18n";
import { PrintView } from "./PrintView";

const A4 = { width_pt: 595.3, height_pt: 841.9, rotation: 0 };
const PAGES: PageInfo[] = [0, 1, 2].map((index) => ({ index, ...A4 }));

const srcDescriptor = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "src");
/** Set to false to keep images from ever finishing loading. */
let imagesLoad = true;
/** What the fake printWindowReady saw: how many images had loaded by then. */
let loadedWhenReady = -1;
/** Load events the images have actually handled so far. */
let loadEvents = 0;

beforeEach(() => {
  initI18n("de");
  imagesLoad = true;
  loadedWhenReady = -1;
  loadEvents = 0;
  // jsdom never loads images: fire `load` (counted) shortly after the src assignment.
  Object.defineProperty(HTMLImageElement.prototype, "src", {
    configurable: true,
    get(this: HTMLImageElement) {
      return this.getAttribute("src") ?? "";
    },
    set(this: HTMLImageElement, value: string) {
      this.setAttribute("src", value);
      this.addEventListener("load", () => loadEvents++, { once: true });
      if (imagesLoad) setTimeout(() => this.dispatchEvent(new Event("load")), 0);
    },
  });
});

afterEach(() => {
  if (srcDescriptor) Object.defineProperty(HTMLImageElement.prototype, "src", srcDescriptor);
});

async function setup(backendOverride?: (fake: FakeBackend) => void) {
  const fake = new FakeBackend({ "/a.pdf": { page_count: 3, pages: PAGES } });
  const info = await fake.openDocument("/a.pdf");
  backendOverride?.(fake);
  const onClose = vi.fn();
  render(<PrintView backend={fake} docId={info.id} onClose={onClose} />);
  return { fake, onClose, id: info.id };
}

test("wraps every page image in its own sheet box", async () => {
  await setup();
  await waitFor(() => expect(screen.getAllByTestId("print-page")).toHaveLength(3));
  const sheets = screen.getAllByTestId("print-sheet");
  expect(sheets).toHaveLength(3);
  for (const sheet of sheets) {
    expect(sheet.className).toBe("print-sheet");
    expect(sheet.children).toHaveLength(1);
    expect(sheet.firstElementChild?.getAttribute("data-testid")).toBe("print-page");
  }
});

test("renders every page at 300 dpi in page order", async () => {
  const { fake, id } = await setup();
  await waitFor(() => expect(screen.getAllByTestId("print-page")).toHaveLength(3));
  const images = screen.getAllByTestId("print-page");
  for (const image of images) expect(image.getAttribute("src")).toMatch(/^blob:/);
  expect(images.map((i) => i.getAttribute("alt"))).toEqual(["Seite 1", "Seite 2", "Seite 3"]);
  const renders = fake.calls.filter((c) => c.startsWith("render:"));
  expect(renders).toEqual([`render:${id}:0:2480`, `render:${id}:1:2480`, `render:${id}:2:2480`]);
});

test("asks the shell to print exactly once, after all three images have loaded", async () => {
  const { fake } = await setup((f) => {
    const original = f.printWindowReady.bind(f);
    f.printWindowReady = () => {
      loadedWhenReady = loadEvents;
      return original();
    };
  });
  await screen.findByText("Der Druckdialog öffnet sich.");
  expect(fake.calls.filter((c) => c === "print_ready")).toHaveLength(1);
  expect(loadedWhenReady).toBe(3);
});

test("does not print while an image is still loading", async () => {
  imagesLoad = false;
  const { fake } = await setup();
  await waitFor(() => expect(screen.getAllByTestId("print-page")).toHaveLength(3));
  expect(fake.calls).not.toContain("print_ready");
  expect(screen.queryByText("Der Druckdialog öffnet sich.")).not.toBeInTheDocument();
});

test("shows the progress while pages are prepared", async () => {
  imagesLoad = false;
  await setup();
  await screen.findByText("Seiten werden vorbereitet (3 von 3)…");
});

test("a failing render shows the error and never prints", async () => {
  const { fake } = await setup((f) => {
    f.renderPage = async () => {
      throw { kind: "engine", message: "broken page" };
    };
  });
  await screen.findByRole("alert");
  expect(screen.getByRole("alert")).toHaveTextContent("Beim Verarbeiten der PDF-Datei ist ein Fehler aufgetreten.");
  expect(fake.calls).not.toContain("print_ready");
});

test("the close button calls onClose", async () => {
  const { onClose } = await setup();
  await screen.findByText("Der Druckdialog öffnet sich.");
  screen.getByRole("button", { name: "Schließen" }).click();
  expect(onClose).toHaveBeenCalledTimes(1);
});
