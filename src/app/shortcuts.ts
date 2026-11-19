export type ShortcutAction =
  | "open"
  | "closeActive"
  | "zoomIn"
  | "zoomOut"
  | "fitWidth"
  | "fitPage"
  | "nextPage"
  | "prevPage"
  | "firstPage"
  | "lastPage"
  | "focusSearch"
  | "print"
  | "nextTab";

/** Written with Ctrl; on macOS Cmd (Meta) takes its place, except for Ctrl+Tab, which macOS keeps for apps. */
export const SHORTCUTS: Record<string, ShortcutAction> = {
  "Ctrl+O": "open",
  "Ctrl+W": "closeActive",
  "Ctrl+=": "zoomIn",
  "Ctrl+-": "zoomOut",
  "Ctrl+0": "fitWidth",
  "Ctrl+1": "fitPage",
  PageDown: "nextPage",
  PageUp: "prevPage",
  Home: "firstPage",
  End: "lastPage",
  "Ctrl+F": "focusSearch",
  "Ctrl+P": "print",
  "Ctrl+Tab": "nextTab",
};

export const IS_MAC = /Mac|iPhone|iPad/.test(
  typeof navigator === "undefined" ? "" : navigator.platform || navigator.userAgent,
);

/** "+" sits on its own key on German and French keyboards; both mean zoom in. */
function normaliseKey(key: string): string {
  if (key === "+") return "=";
  return key.length === 1 ? key.toUpperCase() : key;
}

function isTextField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

export function matchShortcut(e: KeyboardEvent, isMac = IS_MAC): ShortcutAction | null {
  if (e.altKey) return null;
  const key = normaliseKey(e.key);
  const command = key === "Tab" ? e.ctrlKey : isMac ? e.metaKey : e.ctrlKey;
  const other = key === "Tab" ? e.metaKey : isMac ? e.ctrlKey : e.metaKey;
  if (other) return null;
  // The digit row by position: on AZERTY Ctrl+0 is "à" (and "0" needs Shift).
  if (command && e.code === "Digit0") return "fitWidth";
  if (command && e.code === "Digit1") return "fitPage";
  // Shift only counts where a symbol needs it (Ctrl+Shift+= on some layouts).
  if (e.shiftKey && key !== "=") return null;
  if (!command && isTextField(e.target)) return null; // Home, End and paging belong to the text field
  return SHORTCUTS[command ? `Ctrl+${key}` : key] ?? null;
}
