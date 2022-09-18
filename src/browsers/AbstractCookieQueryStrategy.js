export default class AbstractCookieQueryStrategy {
  async queryCookies(name, domain) {
    if (process.env.NODE_ENV === "development") {
      console.log("queryCookie", name, domain);
    }
    return [];
  }
}
