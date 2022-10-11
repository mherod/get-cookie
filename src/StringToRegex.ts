export function stringToRegex(s: string): RegExp {
  const s1 = s.replaceAll(/\./gi, ".");
  const s2 = s1.replace(/%/g, ".*");
  const s3 = s2.replace(/\*/g, ".*");
  return new RegExp(s3);
}
