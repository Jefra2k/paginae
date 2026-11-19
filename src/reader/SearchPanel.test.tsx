import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, test } from "vitest";
import App from "../App";
import { BackendProvider } from "../backend/BackendContext";
import { FakeBackend, type FakeFixture } from "../backend/fakeBackend";
import type { PageInfo, RectPt, SearchHit } from "../backend/types";
import de from "../i18n/de.json";
import { initI18n } from "../i18n";
import { rectPtToCss } from "../viewer/geometry";
import { HitOverlay } from "../viewer/HitOverlay";

const R: RectPt = { left: 72, bottom: 700, right: 140, top: 712 };
const R2: RectPt = { left: 72, bottom: 500, right: 150, top: 512 };
const R3: RectPt = { left: 100, bottom: 300, right: 190, top: 312 };
const HITS: SearchHit[] = [
  { page_index: 1, rects: [R] },
  { page_index: 1, rects: [R2] },
  { page_index: 2, rects: [R3] },
];

const descriptors = {
  clientWidth: Object.getOwnPropertyDescriptor(HTMLElement.prototype, "clientWidth"),
  clientHeight: Object.getOwnPropertyDescriptor(HTMLElement.prototype, "clientHeight"),
};

// jsdom has no layout: the document view measures 1048 x 800, so a fit-width page is 1000 px wide.
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

async function openApp(fixture: FakeFixture) {
  const fake = new FakeBackend({ "/a.pdf": { page_count: 3, ...fixture } });
  fake.startupPath = "/a.pdf";
  render(
    <BackendProvider backend={fake}>
      <App />
    </BackendProvider>,
  );
  await waitFor(() => expect(fake.calls).toContain("hasText:1"));
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  return fake;
}

async function searchFor(text: string) {
  const input = await screen.findByTestId("search-input");
  await userEvent.type(input, `${text}{Enter}`);
  return input;
}

test("Enter runs the search and shows the count and the hits grouped by page", async () => {
  const fake = await openApp({ hits: HITS });
  await searchFor("echternach");
  expect(fake.calls).toContain("search:1:echternach");
  expect(await screen.findByText("3 Treffer")).toBeInTheDocument();
  expect(screen.getByText(/^Seite 2 · 2 Treffer$/)).toBeInTheDocument();
  expect(screen.getByText(/^Seite 3 · 1 Treffer$/)).toBeInTheDocument();
  expect(screen.getAllByTestId("hit")).toHaveLength(3);
});

test("F3 steps to the next hit and marks it as the current one; Shift+F3 goes back, both cyclic", async () => {
  await openApp({ hits: HITS });
  await searchFor("echternach");
  await screen.findByText("3 Treffer");
  let hits = screen.getAllByTestId("hit");
  expect(hits.map((h) => h.classList.contains("current"))).toEqual([true, false, false]);

  await userEvent.keyboard("{F3}{F3}");
  hits = screen.getAllByTestId("hit");
  expect(hits.map((h) => h.classList.contains("current"))).toEqual([false, false, true]);
  expect(hits[2]).toHaveClass("hit", "current");

  await userEvent.keyboard("{F3}");
  expect(screen.getAllByTestId("hit")[0]).toHaveClass("current");

  await userEvent.keyboard("{Shift>}{F3}{/Shift}");
  expect(screen.getAllByTestId("hit")[2]).toHaveClass("current");
});

test("clicking a hit in the list makes it the current one", async () => {
  await openApp({ hits: HITS });
  await searchFor("echternach");
  const group = (await screen.findByText(/^Seite 3 · 1 Treffer$/)).closest("li") as HTMLElement;
  await userEvent.click(within(group).getAllByRole("button")[0]);
  expect(screen.getAllByTestId("hit")[2]).toHaveClass("current");
});

test("the prev and next buttons are cyclic too", async () => {
  await openApp({ hits: HITS });
  await searchFor("echternach");
  await screen.findByText("3 Treffer");
  await userEvent.click(screen.getByRole("button", { name: de.reader.prevHit }));
  expect(screen.getAllByTestId("hit")[2]).toHaveClass("current");
  await userEvent.click(screen.getByRole("button", { name: de.reader.nextHit }));
  expect(screen.getAllByTestId("hit")[0]).toHaveClass("current");
});

test("HitOverlay places a div per rectangle of the page using rectPtToCss", () => {
  const page: PageInfo = {
    index: 1,
    width_pt: 595,
    height_pt: 842,
    rotation: 0,
  };
  render(<HitOverlay hits={HITS} page={page} cssWidth={1000} currentKey="1" />);
  const hits = screen.getAllByTestId("hit");
  expect(hits).toHaveLength(2);
  const expected = [rectPtToCss(R, page, 1000), rectPtToCss(R2, page, 1000)];
  hits.forEach((hit, i) => {
    expect(parseFloat(hit.style.left)).toBeCloseTo(expected[i].left, 2); // jsdom keeps three decimals
    expect(parseFloat(hit.style.top)).toBeCloseTo(expected[i].top, 2); // jsdom keeps three decimals
    expect(parseFloat(hit.style.width)).toBeCloseTo(expected[i].width, 2); // jsdom keeps three decimals
    expect(parseFloat(hit.style.height)).toBeCloseTo(expected[i].height, 2); // jsdom keeps three decimals
  });
  expect(hits[0]).not.toHaveClass("current");
  expect(hits[1]).toHaveClass("current");
});

test("in the app the overlay of page 2 sits at the converted position", async () => {
  await openApp({ hits: HITS });
  await searchFor("echternach");
  await screen.findByText("3 Treffer");
  const page: PageInfo = {
    index: 1,
    width_pt: 595,
    height_pt: 842,
    rotation: 0,
  };
  const expected = rectPtToCss(R, page, 1000);
  const first = screen.getAllByTestId("hit")[0];
  expect(parseFloat(first.style.left)).toBeCloseTo(expected.left, 2); // jsdom keeps three decimals
  expect(parseFloat(first.style.top)).toBeCloseTo(expected.top, 2); // jsdom keeps three decimals
});

test("a search without results says so", async () => {
  await openApp({ hits: [] });
  await searchFor("nichts");
  expect(await screen.findByText(de.reader.noHits)).toBeInTheDocument();
  expect(screen.queryByText(de.reader.noText)).not.toBeInTheDocument();
});

test("a scan without text layer explains why nothing is found", async () => {
  await openApp({ hits: [], hasText: false });
  await searchFor("echternach");
  expect(await screen.findByText(de.reader.noText)).toBeInTheDocument();
  expect(screen.queryByText(de.reader.noHits)).not.toBeInTheDocument();
});

test("Esc clears the search and removes the overlays", async () => {
  await openApp({ hits: HITS });
  const input = await searchFor("echternach");
  await screen.findByText("3 Treffer");
  await userEvent.keyboard("{Escape}");
  expect(screen.queryAllByTestId("hit")).toHaveLength(0);
  expect(screen.queryByText("3 Treffer")).not.toBeInTheDocument();
  expect(input).toHaveValue("");
});

test("Ctrl+F focuses the search field", async () => {
  await openApp({ hits: HITS });
  const input = await screen.findByTestId("search-input");
  expect(input).not.toHaveFocus();
  await userEvent.keyboard("{Control>}f{/Control}");
  expect(input).toHaveFocus();
});

test("the search field has the catalog placeholder", async () => {
  await openApp({ hits: HITS });
  expect(await screen.findByPlaceholderText(de.reader.searchPlaceholder)).toBeInTheDocument();
});
