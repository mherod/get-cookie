/**
 * Converts a string pattern into a regular expression
 * Handles special characters: '.' is escaped, '%' and '*' are converted to '.*'
 * @param s The string pattern to convert
 * @returns A RegExp object that matches the pattern
 * @example
 * stringToRegex('%.example.com') // returns /.*\.example\.com/
 * stringToRegex('example.com') // returns /example\.com/
 */
export function stringToRegex(s: string): RegExp {
  // Replace all occurrences of '.' with a literal '\.'
  const s1: string = s.replace(/\./g, "\\.");
  // Replace all occurrences of '%' with '.*' to match any number of any characters
  const s2: string = s1.replace(/%/g, ".*");
  // Replace all occurrences of '*' with '.*' to match any number of any characters
  const s3: string = s2.replace(/\*/g, ".*");
  // Return the new string as a RegExp object
  return new RegExp(s3);
}

/*
%.example.com -> .*\.example\.com
example.com -> example\.com
*/
