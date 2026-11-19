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

test("F3, Shift+F3 and Escape step through search hits and clear the search", () => {
  expect(matchShortcut(key({ key: "F3" }), false)).toBe("nextHit");
  expect(matchShortcut(key({ key: "F3", shiftKey: true }), false)).toBe("prevHit");
  expect(matchShortcut(key({ key: "Escape" }), false)).toBe("clearSearch");
  expect(matchShortcut(key({ key: "F3", ctrlKey: true }), false)).toBeNull();
  expect(matchShortcut(key({ key: "f", ctrlKey: true }), false)).toBe("focusSearch");
});

test("F3 and Escape also work while typing in a text field", () => {
  const input = document.createElement("input");
  document.body.append(input);
  const matched: unknown[] = [];
  input.addEventListener("keydown", (e) => matched.push(matchShortcut(e, false)));
  input.dispatchEvent(key({ key: "F3", bubbles: true }));
  input.dispatchEvent(key({ key: "Escape", bubbles: true }));
  input.dispatchEvent(key({ key: "End", bubbles: true }));
  expect(matched).toEqual(["nextHit", "clearSearch", null]);
  input.remove();
});
