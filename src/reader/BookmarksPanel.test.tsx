import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";
import type { Bookmark } from "../backend/types";
import de from "../i18n/de.json";
import { initI18n } from "../i18n";
import { BookmarksPanel } from "./BookmarksPanel";

beforeEach(() => {
  initI18n("de");
});

const TREE: Bookmark[] = [
  { title: "Vorwort", page_index: 0, children: [] },
  {
    title: "Kapitel 1",
    page_index: 2,
    children: [
      { title: "Abschnitt 1.1", page_index: 3, children: [] },
      { title: "Abschnitt 1.2", page_index: 4, children: [] },
    ],
  },
];

test("a node with children starts collapsed and expands on demand", async () => {
  render(<BookmarksPanel bookmarks={TREE} onGo={() => {}} />);
  expect(screen.getByText("Vorwort")).toBeInTheDocument();
  expect(screen.queryByText("Abschnitt 1.1")).not.toBeInTheDocument();
  const toggle = screen.getByRole("button", { expanded: false });
  await userEvent.click(toggle);
  expect(toggle).toHaveAttribute("aria-expanded", "true");
  expect(screen.getByText("Abschnitt 1.1")).toBeInTheDocument();
  expect(screen.getByText("Abschnitt 1.2")).toBeInTheDocument();
  await userEvent.click(toggle);
  expect(screen.queryByText("Abschnitt 1.1")).not.toBeInTheDocument();
});

test("clicking a title goes to its page", async () => {
  const onGo = vi.fn();
  render(<BookmarksPanel bookmarks={TREE} onGo={onGo} />);
  await userEvent.click(screen.getByRole("button", { expanded: false }));
  await userEvent.click(screen.getByText("Abschnitt 1.2"));
  expect(onGo).toHaveBeenCalledWith(4);
  await userEvent.click(screen.getByText("Vorwort"));
  expect(onGo).toHaveBeenLastCalledWith(0);
});

test("an entry without a page is not clickable", async () => {
  const onGo = vi.fn();
  render(<BookmarksPanel bookmarks={[{ title: "Ohne Ziel", page_index: null, children: [] }]} onGo={onGo} />);
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
  await userEvent.click(screen.getByText("Ohne Ziel"));
  expect(onGo).not.toHaveBeenCalled();
});

test("without bookmarks the panel says so", () => {
  render(<BookmarksPanel bookmarks={[]} onGo={() => {}} />);
  expect(screen.getByText(de.reader.noBookmarks)).toBeInTheDocument();
});
