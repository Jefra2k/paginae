/**
 * Wraps the bytes of a `render_page` reply into a PNG blob. Tauri hands over an `ArrayBuffer`
 * on its fast IPC channel, but a plain array of numbers when it falls back to the slower
 * message channel (seen under WebDriver). Both must yield a valid image.
 */
export function pngBlob(data: ArrayBuffer | ArrayLike<number>): Blob {
  const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : Uint8Array.from(data);
  return new Blob([bytes], { type: "image/png" });
}
