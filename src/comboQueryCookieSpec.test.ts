import { MultiCookieSpec } from "./CookieSpec";
import CookieQueryStrategy from "./browsers/CookieQueryStrategy";
import MockCookieQueryStrategy from "./browsers/mock/MockCookieQueryStrategy";
import { comboQueryCookieSpec } from "./comboQueryCookieSpec";
import { CookieQueryOptions } from "./cookieQueryOptions";

describe("comboQueryCookieSpec", () => {
  let cookieSpec: MultiCookieSpec;
  let options: CookieQueryOptions<CookieQueryStrategy>;

  beforeEach(() => {
    cookieSpec = {
      domain: "example.com",
      name: "test",
    };
    options = {
      strategy: new MockCookieQueryStrategy([
        // mock available cookies here
        {
          name: "test",
          value: "test",
          domain: "example.com",
          expiry: "Infinity",
        },
      ]),
      limit: 10,
      removeExpired: true,
    };
  });

  it("should return an array of cookies", async () => {
    const result = await comboQueryCookieSpec(cookieSpec, options);
    expect(result).toBeInstanceOf(Array);
  });

  it("should limit the number of cookies returned", async () => {
    options.limit = 5;
    const result = await comboQueryCookieSpec(cookieSpec, options);
    expect(result.length).toBeLessThanOrEqual(5);
  });

  it("should return cookies with the correct domain", async () => {
    const result = await comboQueryCookieSpec(cookieSpec, options);
    expect(result[0].domain).toBe("example.com");
  });

  it("should return cookies with the correct name", async () => {
    const result = await comboQueryCookieSpec(cookieSpec, options);
    expect(result[0].name).toBe("test");
  });

  it("should return cookies with the correct value", async () => {
    const result = await comboQueryCookieSpec(cookieSpec, options);
    expect(result[0].value).toBe("test");
  });

  it("should return cookies with the correct expiry", async () => {
    const result = await comboQueryCookieSpec(cookieSpec, options);
    expect(result[0].expiry).toBe("Infinity");
  });

  it("should return cookies with the correct meta", async () => {
    const result = await comboQueryCookieSpec(cookieSpec, options);
    expect(result[0].meta).toBeUndefined();
  });

  it("should return cookies when limit is undefined", async () => {
    options.limit = undefined;
    const result = await comboQueryCookieSpec(cookieSpec, options);
    expect(result.length).toBe(1);
  });

  it("should return cookies when removeExpired is false", async () => {
    options.removeExpired = false;
    const result = await comboQueryCookieSpec(cookieSpec, options);
    expect(result.length).toBe(1);
  });

  // it('should not return cookies when removeExpired is true and expiry is past', async () => {
  //     options.removeExpired = true;
  //     cookieSpec.expiry = new Date('2000-01-01');
  //     const result = await comboQueryCookieSpec(cookieSpec, options);
  //     expect(result.length).toBe(0);
  // });

  // it('should return cookies when removeExpired is true and expiry is future', async () => {
  //     options.removeExpired = true;
  //     cookieSpec.expiry = new Date('3000-01-01');
  //     const result = await comboQueryCookieSpec(cookieSpec, options);
  //     expect(result.length).toBe(1);
  // });
});
