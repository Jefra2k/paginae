import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test } from "vitest";
import { BackendProvider } from "../backend/BackendContext";
import { FakeBackend } from "../backend/fakeBackend";
import { initI18n } from "../i18n";
import { AppShell } from "./AppShell";

function renderShell({ language = "de" }: { language?: "de" | "fr" } = {}) {
  initI18n(language);
  return render(
    <BackendProvider backend={new FakeBackend({})}>
      <AppShell />
    </BackendProvider>,
  );
}

test("shows the five modes with German labels, only Lesen enabled", () => {
  renderShell();
  expect(screen.getByTestId("mode-read")).toHaveTextContent("Lesen");
  expect(screen.getByTestId("mode-comment")).toHaveAttribute("aria-disabled", "true");
  // Anchored so the pane toggle "Seitenübersicht ausblenden" does not count as the mode "Seiten".
  expect(screen.getAllByRole("button", { name: /^(Kommentieren|Ausfüllen|Seiten|Werkzeuge)$/ })).toHaveLength(4);
});

test("renders French when the language is fr", () => {
  renderShell({ language: "fr" });
  expect(screen.getByTestId("mode-read")).toHaveTextContent("Lecture");
});

test("left and right panes collapse and expand", async () => {
  renderShell();
  await userEvent.click(screen.getByTestId("toggle-left"));
  expect(screen.getByTestId("pane-left")).toHaveAttribute("data-collapsed", "true");
  await userEvent.click(screen.getByTestId("toggle-left"));
  expect(screen.getByTestId("pane-left")).toHaveAttribute("data-collapsed", "false");
  await userEvent.click(screen.getByTestId("toggle-right"));
  expect(screen.getByTestId("pane-right")).toHaveAttribute("data-collapsed", "true");
  await userEvent.click(screen.getByTestId("toggle-right"));
  expect(screen.getByTestId("pane-right")).toHaveAttribute("data-collapsed", "false");
});

test("FakeBackend reports unknown paths as io errors", async () => {
  const fake = new FakeBackend({});
  await expect(fake.openDocument("/nope.pdf")).rejects.toMatchObject({ kind: "io" });
});
