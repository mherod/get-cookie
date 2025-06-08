import { cookieSpecsFromUrl } from "../core/cookies/cookieSpecsFromUrl";

describe("cookieSpecsFromUrl - error handling", () => {
  it("should handle invalid URLs", () => {
    const specs = cookieSpecsFromUrl("not-a-url");
    expect(Array.isArray(specs)).toBe(true);
    expect(specs.length).toBe(1);

    const spec = specs[0] as unknown;
    expect(spec).toMatchObject({
      name: "%",
      domain: "not-a-url",
    });
  });

  it("should handle URLs without protocol", () => {
    const specs = cookieSpecsFromUrl("example.com");
    expect(Array.isArray(specs)).toBe(true);
    expect(specs.length).toBe(1);

    const spec = specs[0] as unknown;
    expect(spec).toMatchObject({
      name: "%",
      domain: "example.com",
    });
  });
});
