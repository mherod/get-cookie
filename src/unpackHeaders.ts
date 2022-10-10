export function unpackHeaders(headerArgs: string[] | string) {
  const headers: any = {};
  if (Array.isArray(headerArgs)) {
    for (const h of headerArgs) {
      const [key, value] = h.split("=");
      headers[key] = value;
    }
  } else {
    const [key, value] = headerArgs.split("=");
    headers[key] = value;
  }
  return headers;
}
