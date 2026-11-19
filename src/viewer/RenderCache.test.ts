import { afterEach, expect, test, vi } from "vitest";
import { FakeBackend } from "../backend/fakeBackend";
import { RenderCache } from "./RenderCache";

afterEach(() => vi.restoreAllMocks());

async function openedFake(): Promise<FakeBackend> {
  const fake = new FakeBackend({ "/a.pdf": { page_count: 3 } });
  await fake.openDocument("/a.pdf");
  return fake;
}

const renders = (fake: FakeBackend, call: string) => fake.calls.filter((c) => c === call).length;

test("two gets with the same key call the backend once", async () => {
  const fake = await openedFake();
  const cache = new RenderCache(fake);
  const [first, second] = await Promise.all([cache.get(1, 0, 900), cache.get(1, 0, 900)]);
  const third = await cache.get(1, 0, 900);
  expect(first).toMatch(/^blob:/);
  expect(second).toBe(first);
  expect(third).toBe(first);
  expect(renders(fake, "render:1:0:900")).toBe(1);
});

test("after invalidate the next get renders again", async () => {
  const fake = await openedFake();
  const cache = new RenderCache(fake);
  await cache.get(1, 0, 900);
  cache.invalidate(1);
  await cache.get(1, 0, 900);
  expect(renders(fake, "render:1:0:900")).toBe(2);
});

test("with max 2 the oldest entry is evicted and its URL revoked", async () => {
  const fake = await openedFake();
  const revoke = vi.spyOn(URL, "revokeObjectURL");
  const cache = new RenderCache(fake, 2);
  const oldest = await cache.get(1, 0, 900);
  const middle = await cache.get(1, 1, 900);
  await cache.get(1, 0, 900); // touch: page 1 is now the oldest
  await cache.get(1, 2, 900);
  expect(revoke).toHaveBeenCalledTimes(1);
  expect(revoke).toHaveBeenCalledWith(middle);
  expect(revoke).not.toHaveBeenCalledWith(oldest);
});

test("invalidate revokes the URLs of that document", async () => {
  const fake = await openedFake();
  const revoke = vi.spyOn(URL, "revokeObjectURL");
  const cache = new RenderCache(fake);
  const url = await cache.get(1, 0, 900);
  cache.invalidate(1);
  expect(revoke).toHaveBeenCalledWith(url);
});

test("a get for an id invalidated while loading is rejected with unknown_document", async () => {
  const fake = await openedFake();
  const cache = new RenderCache(fake);
  const pending = cache.get(1, 0, 900);
  cache.invalidate(1);
  await expect(pending).rejects.toMatchObject({ kind: "unknown_document" });
});
