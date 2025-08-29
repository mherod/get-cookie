import { execSimple } from "../../../../utils/execSimple";

/**
 * Attempts to retrieve Chrome password from various Linux keyrings
 *
 * Chrome on Linux can store passwords in:
 * 1. GNOME Keyring (via libsecret)
 * 2. KWallet (KDE)
 * 3. Basic password store (plaintext "peanuts")
 *
 * @returns The Chrome Safe Storage password
 */
export async function getChromePassword(): Promise<string> {
  // Try different methods in order of preference

  // Method 1: Try libsecret (GNOME Keyring)
  try {
    const command =
      "secret-tool lookup application chrome-libsecret-password-v2 || " +
      "secret-tool lookup application chrome";
    const result = await execSimple(command);
    const password = result.stdout.trim();
    if (password) {
      return password;
    }
  } catch {
    // Continue to next method
  }

  // Method 2: Try python keyring module
  try {
    const command =
      "python3 -c \"import keyring; print(keyring.get_password('Chrome Safe Storage', 'Chrome'))\"";
    const result = await execSimple(command);
    const password = result.stdout.trim();
    if (password && password !== "None") {
      return password;
    }
  } catch {
    // Continue to next method
  }

  // Method 3: Try KWallet (KDE)
  try {
    const command =
      'kwallet-query kdewallet -f "Chrome Safe Storage" -r Chrome';
    const result = await execSimple(command);
    const password = result.stdout.trim();
    if (password) {
      return password;
    }
  } catch {
    // Continue to fallback
  }

  // Method 4: Fallback to default password
  // On some Linux systems, Chrome uses a hardcoded password
  return "peanuts";
}
