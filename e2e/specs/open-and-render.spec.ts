describe("Paginae opens a PDF at start-up", () => {
  it("shows the file tab and renders page 1", async () => {
    const tab = await $('[data-testid="tab"]');
    await expect(tab).toHaveText(expect.stringContaining("fixture.pdf"));
    // The thumbnail pane and the document view both render page images; the first match is page 1.
    const img = (await $$('[data-testid="page-image"]'))[0];
    await img.waitForDisplayed({ timeout: 15000 });
    // Displayed does not mean decoded yet: wait until the browser has loaded the bitmap.
    const naturalWidth = () =>
      browser.execute(
        () => (document.querySelector('[data-testid="page-image"]') as HTMLImageElement).naturalWidth,
      );
    await browser.waitUntil(async () => (await naturalWidth()) > 100, {
      timeout: 15000,
      timeoutMsg: "page 1 image did not load",
    });
    expect(await naturalWidth()).toBeGreaterThan(100);
  });
});
