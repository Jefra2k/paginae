import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode } from "react";
import { beforeEach, expect, test, vi } from "vitest";
import App from "../App";
import { BackendProvider } from "../backend/BackendContext";
import { FakeBackend } from "../backend/fakeBackend";
import de from "../i18n/de.json";
import { initI18n } from "../i18n";
import { PasswordDialog } from "./PasswordDialog";

beforeEach(() => {
  initI18n("de");
});

test("the dialog focuses the password field, Enter submits and Esc cancels", async () => {
  const onSubmit = vi.fn();
  const onCancel = vi.fn();
  render(<PasswordDialog fileName="p.pdf" onSubmit={onSubmit} onCancel={onCancel} />);
  const dialog = screen.getByRole("dialog");
  expect(dialog).toHaveAttribute("aria-modal", "true");
  expect(dialog).toHaveTextContent("„p.pdf“");
  const input = screen.getByLabelText(de.password.label);
  expect(input).toHaveAttribute("type", "password");
  expect(input).toHaveFocus();
  await userEvent.keyboard("geheim{Enter}");
  expect(onSubmit).toHaveBeenCalledWith("geheim");
  await userEvent.keyboard("{Escape}");
  expect(onCancel).toHaveBeenCalledTimes(1);
});

test("the dialog shows the wrong-password message", () => {
  render(<PasswordDialog fileName="p.pdf" error="wrong" onSubmit={() => {}} onCancel={() => {}} />);
  expect(screen.getByText(de.password.wrong)).toBeInTheDocument();
});

function renderApp() {
  const fake = new FakeBackend({ "/p.pdf": { page_count: 1, password: "geheim" } });
  fake.startupPath = "/p.pdf";
  render(
    <StrictMode>
      <BackendProvider backend={fake}>
        <App />
      </BackendProvider>
    </StrictMode>,
  );
  return fake;
}

test("a protected file asks for the password, rejects a wrong one and opens with the right one", async () => {
  const fake = renderApp();
  const dialog = await screen.findByRole("dialog");
  expect(dialog).toHaveTextContent("p.pdf");
  expect(screen.queryByText(de.password.wrong)).toBeNull();

  await userEvent.keyboard("falsch{Enter}");
  expect(await screen.findByText(de.password.wrong)).toBeInTheDocument();
  expect(fake.calls).toContain("open:/p.pdf:falsch");

  await userEvent.keyboard("geheim{Enter}");
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(fake.calls).toContain("open:/p.pdf:geheim");
  await waitFor(() => expect(screen.getAllByTestId("tab")).toHaveLength(1));
  expect(screen.getByTestId("tab")).toHaveTextContent("p.pdf");
  await waitFor(() => expect(fake.calls).toContain("hasText:1"));
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
});

test("Esc in the password dialog closes it without opening a document", async () => {
  const fake = renderApp();
  await screen.findByRole("dialog");
  await userEvent.keyboard("{Escape}");
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(screen.queryAllByTestId("tab")).toHaveLength(0);
  expect(screen.getByText(de.start.headline)).toBeInTheDocument();
  expect(screen.queryByRole("alert")).toBeNull();
  expect(fake.recent).toHaveLength(0);
});
