import { describe, expect, it } from "vitest";
import { pngBlob } from "./pngBlob";

const SIGNATURE = [137, 80, 78, 71];

async function bytesOf(blob: Blob): Promise<number[]> {
  return Array.from(new Uint8Array(await blob.arrayBuffer()));
}

describe("pngBlob", () => {
  it("keeps the bytes of an ArrayBuffer", async () => {
    const blob = pngBlob(new Uint8Array(SIGNATURE).buffer);
    expect(blob.type).toBe("image/png");
    expect(await bytesOf(blob)).toEqual(SIGNATURE);
  });

  it("turns a plain number array (message-channel fallback) into the same bytes", async () => {
    const blob = pngBlob(SIGNATURE);
    expect(blob.type).toBe("image/png");
    expect(await bytesOf(blob)).toEqual(SIGNATURE);
  });
});
