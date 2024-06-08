// This function converts a string into a regular expression
export function stringToRegex(s: string): RegExp {
  // Replace all occurrences of '.' with a literal '\.'
  let s1: string = s.replace(/\./g, "\\.");
  // Replace all occurrences of '%' with '.*' to match any number of any characters
  let s2: string = s1.replace(/%/g, ".*");
  // Replace all occurrences of '*' with '.*' to match any number of any characters
  let s3: string = s2.replace(/\*/g, ".*");
  // Return the new string as a RegExp object
  return new RegExp(s3);
}

/*
%.example.com -> .*\.example\.com
example.com -> example\.com
*/
