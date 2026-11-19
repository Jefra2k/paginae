import { expect, test } from "vitest";
import { matchShortcut } from "./shortcuts";

const key = (init: KeyboardEventInit) => new KeyboardEvent("keydown", init);

test("ctrl shortcuts match by key on Windows semantics", () => {
  expect(matchShortcut(key({ key: "w", ctrlKey: true }), false)).toBe("closeActive");
  expect(matchShortcut(key({ key: "o", ctrlKey: true }), false)).toBe("open");
  expect(matchShortcut(key({ key: "+", ctrlKey: true }), false)).toBe("zoomIn");
  expect(matchShortcut(key({ key: "-", ctrlKey: true }), false)).toBe("zoomOut");
  expect(matchShortcut(key({ key: "Tab", ctrlKey: true }), false)).toBe("nextTab");
  expect(matchShortcut(key({ key: "PageDown" }), false)).toBe("nextPage");
  expect(matchShortcut(key({ key: "w" }), false)).toBeNull();
  expect(matchShortcut(key({ key: "w", ctrlKey: true, shiftKey: true }), false)).toBeNull();
});

test("on macOS Cmd takes the place of Ctrl", () => {
  expect(matchShortcut(key({ key: "w", metaKey: true }), true)).toBe("closeActive");
  expect(matchShortcut(key({ key: "w", ctrlKey: true }), true)).toBeNull();
});

test("Ctrl+0 and Ctrl+1 match by key position, so AZERTY layouts work", () => {
  expect(matchShortcut(key({ key: "0", code: "Digit0", ctrlKey: true }), false)).toBe("fitWidth");
  expect(matchShortcut(key({ key: "à", code: "Digit0", ctrlKey: true }), false)).toBe("fitWidth");
  expect(matchShortcut(key({ key: "0", code: "Digit0", ctrlKey: true, shiftKey: true }), false)).toBe("fitWidth");
  expect(matchShortcut(key({ key: "&", code: "Digit1", ctrlKey: true }), false)).toBe("fitPage");
});

test("keys without a modifier are left to text fields", () => {
  const input = document.createElement("input");
  document.body.append(input);
  const event = key({ key: "Home", bubbles: true });
  let matched: unknown = "unset";
  input.addEventListener("keydown", (e) => (matched = matchShortcut(e, false)));
  input.dispatchEvent(event);
  expect(matched).toBeNull();
  input.remove();
});
