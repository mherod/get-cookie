import { cookieSpecsFromUrl } from "../cookies/cookieSpecsFromUrl";

describe("cookieSpecsFromUrl - basic URL handling", function () {
  it("should extract cookie specs from a simple URL", function () {
    const specs = cookieSpecsFromUrl("https://example.com");
    expect(Array.isArray(specs)).toBe(true);
    expect(specs.length).toBe(1);

    const spec = specs[0] as unknown;
    expect(spec).toMatchObject({
      name: "%",
      domain: "example.com",
    });
  });

  it("should extract cookie specs from a URL with subdomain", function () {
    const specs = cookieSpecsFromUrl("https://api.example.com");
    expect(Array.isArray(specs)).toBe(true);
    expect(specs.length).toBe(2);

    const spec1 = specs[0] as unknown;
    const spec2 = specs[1] as unknown;

    expect(spec1).toMatchObject({
      name: "%",
      domain: "api.example.com",
    });

    expect(spec2).toMatchObject({
      name: "%",
      domain: "example.com",
    });
  });
});
