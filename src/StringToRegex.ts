// This function converts a string into a regular expression
export function stringToRegex(s: string): RegExp {
  // Replace all occurrences of '.' with a literal '.'
  const s1 = s.replaceAll(/\./gi, ".");
  // Replace all occurrences of '%' with '.*' to match any number of any characters
  const s2 = s1.replace(/%/g, ".*");
  // Replace all occurrences of '*' with '.*' to match any number of any characters
  const s3 = s2.replace(/\*/g, ".*");
  // Return the new string as a RegExp object
  return new RegExp(s3);
}

/*
%.example.com -> .*\.example\.com
example.com -> example\.com
*/
