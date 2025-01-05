import { cookieSpecsFromUrl } from "../cookies/cookieSpecsFromUrl";

describe("cookieSpecsFromUrl - error handling", function () {
  it("should handle invalid URLs", function () {
    const specs = cookieSpecsFromUrl("not-a-url");
    expect(Array.isArray(specs)).toBe(true);
    expect(specs.length).toBe(1);

    const spec = specs[0] as unknown;
    expect(spec).toMatchObject({
      name: "%",
      domain: "not-a-url",
    });
  });

  it("should handle URLs without protocol", function () {
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
