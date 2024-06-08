import { execSimple } from "../../execSimple";

interface PasswordRetriever {
  retrievePassword(): Promise<string>;
}

class MacOSPasswordRetriever implements PasswordRetriever {
  async retrievePassword(): Promise<string> {
    return execSimple(
      'security find-generic-password -w -s "Chrome Safe Storage"',
    );
  }
}

class UnsupportedPlatformPasswordRetriever implements PasswordRetriever {
  async retrievePassword(): Promise<string> {
    return Promise.reject(new Error("This only works on macOS"));
  }
}

const passwordRetriever: PasswordRetriever =
  process.platform == "darwin"
    ? new MacOSPasswordRetriever()
    : new UnsupportedPlatformPasswordRetriever();

export async function getChromePassword(): Promise<string> {
  return await passwordRetriever.retrievePassword();
}
