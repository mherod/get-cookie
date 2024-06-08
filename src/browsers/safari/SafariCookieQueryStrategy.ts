import CookieQueryStrategy from "../CookieQueryStrategy";
import ExportedCookie from "../../ExportedCookie";
import { join } from "path";
import { decodeBinaryCookies } from "../../decodeBinaryCookies"; // Assuming you have a module to decode binary cookies
import CookieRow from "../../CookieRow";

export default class SafariCookieQueryStrategy implements CookieQueryStrategy {
  browserName: string = "Safari";

  async queryCookies(name: string, domain: string): Promise<ExportedCookie[]> {
    const homeDir: string | undefined = process.env.HOME;
    if (!homeDir) {
      throw new Error("HOME environment variable is not set");
    }

    const cookieDbPath: string = join(
      homeDir,
      "Library",
      "Cookies",
      "Cookies.binarycookies",
    );

    try {
      const cookies: CookieRow[] = await decodeBinaryCookies(cookieDbPath);

      const filteredCookies: CookieRow[] = cookies.filter(
        (cookie: CookieRow) => cookie.name === name && cookie.domain.includes(domain)
      );

      const exportedCookies: ExportedCookie[] = filteredCookies.map((cookie: CookieRow) => ({
        domain: cookie.domain,
        name: cookie.name,
        value: cookie.value.toString("utf8"),
      }));

      return exportedCookies;
    } catch (e) {
      console.error(`Error decoding ${cookieDbPath}`, e);
      return [];
    }
  }
}
