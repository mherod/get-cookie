export function unpackHeaders(headerArgs: string[] | undefined): Record<string, string> {
  if (!headerArgs) {
    return {};
  }

  const headers: Record<string, string> = {};

  for (const header of headerArgs) {
    const [key, ...valueParts] = header.split(':');
    const value = valueParts.join(':').trim();
    if (key && value) {
      headers[key.trim()] = value;
    }
  }

  return headers;
}
