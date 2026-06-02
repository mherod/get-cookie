import {
  getChromiumPassword,
  resetChromiumPasswordCache,
} from "../getChromiumPassword";

describe("getChromiumPassword caching", () => {
  beforeEach(() => {
    resetChromiumPasswordCache();
  });

  afterEach(() => {
    resetChromiumPasswordCache();
  });

  it("coalesces concurrent callers onto a single cached lookup", async () => {
    const first = getChromiumPassword("chrome");
    const second = getChromiumPassword("chrome");

    // Same in-flight promise returned => only one underlying lookup runs.
    expect(second).toBe(first);

    // Settle without surfacing rejections in environments without a keychain.
    await Promise.allSettled([first, second]);
  });

  it("keys the cache per browser", async () => {
    const chrome = getChromiumPassword("chrome");
    const brave = getChromiumPassword("brave");

    expect(brave).not.toBe(chrome);

    await Promise.allSettled([chrome, brave]);
  });

  it("performs a fresh lookup after the cache is reset", async () => {
    const before = getChromiumPassword("chrome");
    resetChromiumPasswordCache();
    const after = getChromiumPassword("chrome");

    expect(after).not.toBe(before);

    await Promise.allSettled([before, after]);
  });
});
