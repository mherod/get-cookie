// Define the CookieSpec interface with domain and name properties
export default interface CookieSpec {
  domain: string;
  name: string;
}

// Function to check if an object is of type CookieSpec
export function isCookieSpec(obj: any): obj is CookieSpec {
  return (
    // Check if domain and name properties are of type string
    typeof obj.domain === "string" && typeof obj.name === "string"
  );
}

// Define a type that can be either a single CookieSpec or an array of CookieSpecs
export type MultiCookieSpec = CookieSpec | CookieSpec[];

// Function to check if an object is of type MultiCookieSpec
export function isMultiCookieSpec(obj: any): obj is MultiCookieSpec {
  return (
    // Check if the object is a CookieSpec or an array of CookieSpecs
    isCookieSpec(obj) || (Array.isArray(obj) && obj.every(isCookieSpec))
  );
}
