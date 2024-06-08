const getCookie = () =>
  import("./getCookie").then((module) => module.getCookie);
const getChromeCookie = () =>
  import("./getChromeCookie").then((module) => module.getChromeCookie);
const getFirefoxCookie = () =>
  import("./getFirefoxCookie").then((module) => module.getFirefoxCookie);
const getGroupedRenderedCookies = () =>
  import("./getGroupedRenderedCookies").then(
    (module) => module.getGroupedRenderedCookies,
  );
const getMergedRenderedCookies = () =>
  import("./getMergedRenderedCookies").then(
    (module) => module.getMergedRenderedCookies,
  );
const fetchWithCookies = () =>
  import("./fetchWithCookies").then((module) => module.fetchWithCookies);

export {
  getCookie,
  getChromeCookie,
  getFirefoxCookie,
  getMergedRenderedCookies,
  getGroupedRenderedCookies,
  fetchWithCookies,
  //
};
