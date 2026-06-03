import type { CookieSpec, ExportedCookie } from "../../../../types/schemas";
import { BaseChromiumCookieQueryStrategy } from "../BaseChromiumCookieQueryStrategy";

// getChromiumPassword would otherwise hit the real keychain/DPAPI. Auto-mock it
// so it resolves to undefined; the test subclass overrides processBatchFile and
// ignores the password anyway.
jest.mock("../../chrome/getChromiumPassword");

/**
 * Minimal concrete strategy that bypasses SQLite/decryption so the
 * batchQueryCookies orchestration (batching, ordering, failure isolation,
 * bounded concurrency) can be tested in isolation.
 */
class TestBatchStrategy extends BaseChromiumCookieQueryStrategy {
  /** Tracks live processBatchFile calls to assert concurrency stays bounded. */
  public concurrentNow = 0;
  public concurrentPeak = 0;

  public constructor(
    private readonly files: string[],
    private readonly failingFile: string | null = null,
  ) {
    super("TestBatchStrategy", "TestBrowser", "chrome");
  }

  protected getCookieFilePaths(): string[] {
    return this.files;
  }

  protected override getCookieFiles(): string[] {
    return this.files;
  }

  protected override isPlatformSupported(): boolean {
    return true;
  }

  protected override async processBatchFile(
    file: string,
    _specs: CookieSpec[],
    _password: string | Buffer,
  ): Promise<ExportedCookie[]> {
    this.concurrentNow += 1;
    this.concurrentPeak = Math.max(this.concurrentPeak, this.concurrentNow);
    // Yield so files within a batch genuinely overlap.
    await new Promise((resolve) => setTimeout(resolve, 5));
    this.concurrentNow -= 1;

    if (file === this.failingFile) {
      // Simulate a locked/bad profile that throws rather than returning [].
      throw new Error(`simulated failure for ${file}`);
    }

    return [
      { name: file, domain: "example.com", value: file } as ExportedCookie,
    ];
  }
}

const SPECS: CookieSpec[] = [{ name: "any", domain: "example.com" }];
// More than MAX_CONCURRENT_PROFILE_READS (5) so batching spans two batches.
const SEVEN_FILES = Array.from(
  { length: 7 },
  (_, i) => `/profile-${i}/Cookies`,
);

describe("BaseChromiumCookieQueryStrategy.batchQueryCookies concurrency", () => {
  it("processes every profile and preserves input file order across batches", async () => {
    const strategy = new TestBatchStrategy(SEVEN_FILES);

    const results = await strategy.batchQueryCookies(SPECS);

    expect(results.map((c) => c.name)).toEqual(SEVEN_FILES);
  });

  it("isolates a single failing profile without aborting the rest", async () => {
    const failing = SEVEN_FILES[3];
    const strategy = new TestBatchStrategy(SEVEN_FILES, failing);

    const results = await strategy.batchQueryCookies(SPECS);

    const expected = SEVEN_FILES.filter((f) => f !== failing);
    expect(results.map((c) => c.name)).toEqual(expected);
    expect(results).toHaveLength(SEVEN_FILES.length - 1);
  });

  it("bounds concurrent profile reads to the batch size", async () => {
    const strategy = new TestBatchStrategy(SEVEN_FILES);

    await strategy.batchQueryCookies(SPECS);

    // MAX_CONCURRENT_PROFILE_READS is 5; never all 7 at once.
    expect(strategy.concurrentPeak).toBeLessThanOrEqual(5);
    expect(strategy.concurrentPeak).toBeGreaterThan(1);
  });
});
