import { execSimple } from "../execSimple";

const chromePassword: Promise<string> = execSimple(
  'security find-generic-password -w -s "Chrome Safe Storage"'
);

export async function getChromePassword(): Promise<string> {
  return await chromePassword;
}
