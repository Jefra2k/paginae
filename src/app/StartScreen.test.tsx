import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode } from "react";
import { beforeEach, expect, test, vi } from "vitest";
import App from "../App";
import { BackendProvider } from "../backend/BackendContext";
import { FakeBackend, type FakeFixture } from "../backend/fakeBackend";
import type { RecentFile } from "../backend/types";
import de from "../i18n/de.json";
import { initI18n } from "../i18n";
import { StartScreen } from "./StartScreen";

beforeEach(() => {
  initI18n("de");
});

const FIXTURES: Record<string, FakeFixture> = {
  "/a.pdf": { page_count: 2 },
  "/b.PDF": { page_count: 1 },
  "/c.txt": { page_count: 1 },
};

function renderApp(fake: FakeBackend) {
  return render(
    <StrictMode>
      <BackendProvider backend={fake}>
        <App />
      </BackendProvider>
    </StrictMode>,
  );
}

const opens = (fake: FakeBackend) => fake.calls.filter((c) => c.startsWith("open:"));
const tabNames = () => screen.queryAllByTestId("tab").map((tab) => within(tab).getAllByRole("button")[0].textContent);
const activeTab = () => screen.getAllByTestId("tab").find((tab) => tab.querySelector('[aria-current="true"]'));

/** Waits until the document is open and its text probe has been answered. */
async function waitForOpen(fake: FakeBackend, name: string, id: number) {
  await waitFor(() => expect(tabNames()).toContain(name));
  await waitFor(() => expect(fake.calls).toContain(`hasText:${id}`));
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

test("StartScreen lists recent files and opens them", async () => {
  const recent: RecentFile[] = [
    { path: "/x/one.pdf", name: "one.pdf", openedAt: "2026-11-19T10:00:00Z" },
    { path: "/x/two.pdf", name: "two.pdf", openedAt: "2026-11-18T10:00:00Z" },
  ];
  const onOpen = vi.fn();
  const onOpenPath = vi.fn();
  render(<StartScreen recent={recent} onOpen={onOpen} onOpenPath={onOpenPath} />);
  expect(screen.getByRole("heading", { name: de.start.headline })).toBeInTheDocument();
  expect(screen.getByText(de.start.recent)).toBeInTheDocument();
  const items = screen.getAllByTestId("recent-item");
  expect(items.map((item) => item.textContent)).toEqual(["one.pdf", "two.pdf"]);
  await userEvent.click(items[1]);
  expect(onOpenPath).toHaveBeenCalledWith("/x/two.pdf");
  await userEvent.click(screen.getByTestId("open"));
  expect(onOpen).toHaveBeenCalledTimes(1);
});

test("StartScreen without recent files says so", () => {
  render(<StartScreen recent={[]} onOpen={() => {}} onOpenPath={() => {}} />);
  expect(screen.getByText(de.start.noRecent)).toBeInTheDocument();
  expect(screen.queryAllByTestId("recent-item")).toHaveLength(0);
});

test("without documents the app shows the start screen", async () => {
  const fake = new FakeBackend(FIXTURES);
  renderApp(fake);
  expect(screen.getByText(de.start.headline)).toBeInTheDocument();
  await screen.findByText(de.start.noRecent);
  expect(screen.getByTestId("open")).toHaveTextContent(de.actions.open);
});

test("the start-up file is opened exactly once under StrictMode", async () => {
  const fake = new FakeBackend(FIXTURES);
  fake.startupPath = "/a.pdf";
  renderApp(fake);
  await waitForOpen(fake, "a.pdf", 1);
  expect(opens(fake)).toHaveLength(1);
  expect(tabNames()).toEqual(["a.pdf"]);
  expect(screen.queryByText(de.start.headline)).toBeNull();
});

test("dropped files open only the PDFs, and the recent list puts the newest first", async () => {
  const fake = new FakeBackend(FIXTURES);
  fake.startupPath = "/a.pdf";
  renderApp(fake);
  await waitForOpen(fake, "a.pdf", 1);

  act(() => fake.dropFiles(["/b.PDF", "/c.txt"]));
  await waitForOpen(fake, "b.PDF", 2);
  expect(opens(fake)).toEqual(["open:/a.pdf", "open:/b.PDF"]);
  expect(tabNames()).toEqual(["a.pdf", "b.PDF"]);
  expect(fake.recent).toHaveLength(2);
  expect(fake.recent.map((file) => file.name)).toEqual(["b.PDF", "a.pdf"]);

  // Close both tabs: the start screen shows the recent list.
  await userEvent.click(screen.getByRole("button", { name: "b.PDF schließen" }));
  await userEvent.click(screen.getByRole("button", { name: "a.pdf schließen" }));
  const items = await screen.findAllByTestId("recent-item");
  expect(items.map((item) => item.textContent)).toEqual(["b.PDF", "a.pdf"]);
});

test("opening a missing file from the recent list removes it and shows errors.io", async () => {
  const fake = new FakeBackend(FIXTURES);
  fake.recent = [
    { path: "/gone.pdf", name: "gone.pdf", openedAt: "2026-11-19T10:00:00Z" },
    { path: "/a.pdf", name: "a.pdf", openedAt: "2026-11-18T10:00:00Z" },
  ];
  renderApp(fake);
  const items = await screen.findAllByTestId("recent-item");
  await userEvent.click(items[0]);
  expect(await screen.findByRole("alert")).toHaveTextContent(de.errors.io);
  expect(screen.getAllByTestId("recent-item").map((item) => item.textContent)).toEqual(["a.pdf"]);
  expect(fake.recent.map((file) => file.path)).toEqual(["/a.pdf"]);
});

test("ctrl+W closes the active document and activates its neighbour", async () => {
  const fake = new FakeBackend(FIXTURES);
  fake.startupPath = "/a.pdf";
  renderApp(fake);
  await waitForOpen(fake, "a.pdf", 1);
  act(() => fake.dropFiles(["/b.PDF"]));
  await waitForOpen(fake, "b.PDF", 2);
  expect(activeTab()).toHaveTextContent("b.PDF");

  await userEvent.keyboard("{Control>}w{/Control}");
  await waitFor(() => expect(fake.calls).toContain("close:2"));
  expect(tabNames()).toEqual(["a.pdf"]);
  expect(activeTab()).toHaveTextContent("a.pdf");
  expect(screen.queryByRole("alert")).toBeNull();
});

test("ctrl+O opens the file chosen in the picker", async () => {
  const fake = new FakeBackend(FIXTURES);
  fake.pickResult = "/a.pdf";
  renderApp(fake);
  await screen.findByText(de.start.noRecent);
  await userEvent.keyboard("{Control>}o{/Control}");
  await waitForOpen(fake, "a.pdf", 1);
  expect(opens(fake)).toEqual(["open:/a.pdf"]);
});
