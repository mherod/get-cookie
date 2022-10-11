export function unpackHeaders(headerArgs: string[] | string | null) {
  const headers: any = {};
  if (headerArgs == null) {
    return headers;
  }
  if (Array.isArray(headerArgs)) {
    for (const h of headerArgs) {
      const [key, value] = h.split("=");
      headers[key] = value;
    }
    return headers;
  }
  const [key, value] = headerArgs.split("=");
  headers[key] = value;
  return headers;
}
