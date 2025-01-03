/**
 * Test password used for decryption tests
 * This is a real Chrome encryption password from a test environment
 */
export const TEST_PASSWORD = "lQd+BkD+nBhODek1xUUxXw==";

/**
 * Test cookie data with encrypted and expected decrypted values
 * These are real cookies from GitHub with non-sensitive values
 */
export const TEST_COOKIES = {
  logged_in: {
    encrypted: "7631306F9A47D779AC548BFB0BCE013AE5D4232058813A58C91CC1D16A143FBA05721D0321E47244333D584128B2DFF4857467",
    decrypted: "yes"
  },
  color_mode: {
    encrypted: "7631306F9A47D779AC548BFB0BCE013AE5D4232058813A58C91CC1D16A143FBA05721D19F0C60E11AC0F3392" +
               "E5A2421783D987B081FA89BF7E341EBFCBFAC69373202C061D2BD7D9E8D428064231E0D4688D9349A43B0CA7B1" +
               "C006A03FCB75B011903B1335A00DE256EB6962E8C6759D5D2575DD944C2B4BAEC4C93F6031DACDBB0BBDDD591D" +
               "4537A43DAACA6A7377A447278059A6CAAD23E5C8B779BE847903596AEA8F54D32CC89E25A523C984098431164E" +
               "A391E7B7AB74DC2C5866C33746EF526345E9D308EC5D0443F507941156AFEAEB2491326C25FF3451AC29A4F1AA" +
               "F9DF24E1C621864C20827A1B050A80B0BCB016",
    contains: ["color_mode", "auto"]
  },
  cpu_bucket: {
    encrypted: "7631306F9A47D779AC548BFB0BCE013AE5D4232058813A58C91CC1D16A143FBA05721DAB789B157290AE3D877BFDA7A9870E9D",
    decrypted: "xlg"
  },
  preferred_color_mode: {
    encrypted: "7631306F9A47D779AC548BFB0BCE013AE5D4232058813A58C91CC1D16A143FBA05721D13922F0984C38AA5B7BB9035CF80AF9D",
    decrypted: "dark"
  },
  tz: {
    encrypted: "7631306F9A47D779AC548BFB0BCE013AE5D4232058813A58C91CC1D16A143FBA05721D34D9652F473873944F783BA5D54558C7",
    decrypted: "Europe%2FLondon"
  }
} as const;

/**
 * Test cases for error handling scenarios
 * Each case includes the input that should trigger an error and the expected error message
 */
export const ERROR_CASES = [
  {
    name: "password is not a string",
    input: {
      value: Buffer.from(TEST_COOKIES.logged_in.encrypted, "hex"),
      password: 123 as unknown as string
    },
    error: "password must be a string"
  },
  {
    name: "encrypted data is not a buffer",
    input: {
      value: "not a buffer" as unknown as Buffer,
      password: TEST_PASSWORD
    },
    error: "encryptedData must be a Buffer"
  },
  {
    name: "encrypted data length is not a multiple of 16",
    input: {
      value: Buffer.from("763130" + "6f9a47", "hex"),
      password: TEST_PASSWORD
    },
    error: "Encrypted data length is not a multiple of 16"
  }
] as const;
