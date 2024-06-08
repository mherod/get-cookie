export function unpackHeaders(
  headerArgs: string[] | string | null,
): Record<string, string> {
  const headers: Record<string, string> = {};
  if (headerArgs === null) {
    return headers;
  }
  if (Array.isArray(headerArgs)) {
    for (let i = 0; i < headerArgs.length; i++) {
      const [key, value] = headerArgs[i].split("=");
      headers[key] = value;
    }
  } else {
    const [key, value] = headerArgs.split("=");
    headers[key] = value;
  }
  return headers;
}
