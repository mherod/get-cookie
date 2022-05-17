const {getCookie, getChromeCookie, getFirefoxCookie} = require("../index");

describe("Chrome Querying", () => {
  it("should return a cookie", async () => {
    const cookie = await getChromeCookie({name: "auth"});
    expect(cookie).toEqual("test=test");
  });
});

describe("Firefox Querying", () => {
  it("should return a cookie", async () => {
    // const cookie = await getFirefoxCookie({name: "auth"});
  });
});
