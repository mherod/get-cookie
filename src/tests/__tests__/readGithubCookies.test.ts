import { isJWT } from "../readGithubCookies";

describe("readGithubCookies", () => {
  describe("isJWT", () => {
    it("should return false for null or undefined", () => {
      expect(isJWT(null as unknown as string)).toBe(false);
      expect(isJWT(undefined as unknown as string)).toBe(false);
    });

    it("should return false for non-string values", () => {
      expect(isJWT(123 as unknown as string)).toBe(false);
      expect(isJWT({} as unknown as string)).toBe(false);
      expect(isJWT([] as unknown as string)).toBe(false);
    });

    it("should return false for strings that don't have three parts", () => {
      expect(isJWT("abc")).toBe(false);
      expect(isJWT("abc.def")).toBe(false);
      expect(isJWT("abc.def.ghi.jkl")).toBe(false);
    });

    it("should return false for strings with invalid base64url encoding", () => {
      expect(isJWT("abc!.def$.ghi#")).toBe(false);
      expect(isJWT("abc=.def=.ghi=")).toBe(false);
      expect(isJWT("abc/.def/.ghi/")).toBe(false);
    });

    it("should return true for valid JWT format", () => {
      expect(isJWT("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c")).toBe(true);
    });
  });
});
