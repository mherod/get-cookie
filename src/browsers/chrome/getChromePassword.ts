import { execSimple } from "../../execSimple";

// top level so it's only called once and cached
const chromePassword: Promise<string> =
  process.platform == "darwin"
    ? execSimple('security find-generic-password -w -s "Chrome Safe Storage"')
    : Promise.reject(new Error("This only works on macOS"));

export async function getChromePassword(): Promise<string> {
  return await chromePassword;
}
