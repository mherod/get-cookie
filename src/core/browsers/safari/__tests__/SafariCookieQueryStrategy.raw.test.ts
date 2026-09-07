import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { withRawCookieValues } from "../../../cookies/CookieQueryContext";
import { BinaryCodableCookie } from "../BinaryCodableCookie";
import { SafariCookieQueryStrategy } from "../SafariCookieQueryStrategy";

// Mock platform utilities so Safari strategy executes on Linux/Windows CI
jest.mock("@utils/platformUtils", () => ({
  ...jest.requireActual("@utils/platformUtils"),
  isMacOS: jest.fn().mockReturnValue(true),
}));

// Mock SystemPermissions utilities
jest.mock("@utils/systemPermissions", () => ({
  checkFilePermission: jest.fn().mockResolvedValue(true),
  handleSafariPermissionError: jest.fn().mockResolvedValue(false),
}));

interface CookieParams {
  url: string;
  name: string;
  path: string;
  value: string;
  flags?: number;
  expiration?: number;
  creation?: number;
}

function buildCookieBuffer(params: CookieParams): Buffer {
  const urlBuf = Buffer.from(`${params.url}\0`, "utf8");
  const nameBuf = Buffer.from(`${params.name}\0`, "utf8");
  const pathBuf = Buffer.from(`${params.path}\0`, "utf8");
  const valBuf = Buffer.from(`${params.value}\0`, "utf8");

  const headerSize = 56;
  const urlOffset = headerSize;
  const nameOffset = urlOffset + urlBuf.length;
  const pathOffset = nameOffset + nameBuf.length;
  const valueOffset = pathOffset + pathBuf.length;
  const totalSize = valueOffset + valBuf.length;

  const buf = Buffer.alloc(totalSize);
  buf.writeUInt32LE(totalSize, 0);
  buf.writeUInt32LE(0, 4); // version
  buf.writeUInt32LE(params.flags ?? 0, 8);
  buf.writeUInt32LE(0, 12); // hasPort = 0
  buf.writeUInt32LE(urlOffset, 16);
  buf.writeUInt32LE(nameOffset, 20);
  buf.writeUInt32LE(pathOffset, 24);
  buf.writeUInt32LE(valueOffset, 28);
  buf.writeUInt32LE(0, 32); // commentOffset
  buf.writeUInt32LE(0, 36); // commentURLOffset
  // Timestamps: seconds since 2001-01-01 (Mac epoch)
  buf.writeDoubleLE(params.expiration ?? 800000000, 40);
  buf.writeDoubleLE(params.creation ?? 700000000, 48);

  urlBuf.copy(buf, urlOffset);
  nameBuf.copy(buf, nameOffset);
  pathBuf.copy(buf, pathOffset);
  valBuf.copy(buf, valueOffset);

  return buf;
}

function buildBinaryCookiesFile(cookieBuffers: Buffer[]): Buffer {
  const headerSize = 4 + 4 + cookieBuffers.length * 4 + 4;
  let currentOffset = headerSize;
  const offsets: number[] = [];
  for (const cb of cookieBuffers) {
    offsets.push(currentOffset);
    currentOffset += cb.length;
  }

  const pageBuffer = Buffer.alloc(currentOffset);
  pageBuffer.writeUInt32BE(0x00000100, 0); // page header
  pageBuffer.writeUInt32LE(cookieBuffers.length, 4);
  for (let i = 0; i < offsets.length; i++) {
    pageBuffer.writeUInt32LE(offsets[i]!, 8 + i * 4);
  }
  pageBuffer.writeUInt32BE(0x00000000, 8 + cookieBuffers.length * 4); // page footer

  for (let i = 0; i < cookieBuffers.length; i++) {
    cookieBuffers[i]!.copy(pageBuffer, offsets[i]);
  }

  const totalLength = 4 + 4 + 4 + pageBuffer.length + 4 + 8;
  const fileBuffer = Buffer.alloc(totalLength);
  fileBuffer.write("cook", 0, 4, "utf8");
  fileBuffer.writeUInt32BE(1, 4); // 1 page
  fileBuffer.writeUInt32BE(pageBuffer.length, 8); // page size
  pageBuffer.copy(fileBuffer, 12);
  const checksumOffset = 12 + pageBuffer.length;
  fileBuffer.writeUInt32BE(0, checksumOffset);
  fileBuffer.writeBigUInt64BE(BigInt("0x071720050000004b"), checksumOffset + 4);

  return fileBuffer;
}

describe("SafariCookieQueryStrategy & BinaryCodableCookie — raw values & metadata", () => {
  let tempDir: string;
  let cookieFilePath: string;

  const rawAuthToken = "prefix-12345678-1234-1234-1234-123456789abc-suffix";
  const jwt =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP8p4w62I";
  const percentEncoded = "user%20token%3Dsecret%26role%3Dadmin%2Bwrite";
  const jsonString = '{"user_id":123,"role":"admin"}';

  beforeAll(() => {
    tempDir = mkdtempSync(join(tmpdir(), "safari-raw-test-"));
    cookieFilePath = join(tempDir, "Cookies.binarycookies");

    const cookies = [
      buildCookieBuffer({
        url: ".example.com",
        name: "auth_token",
        path: "/api",
        value: rawAuthToken,
        flags: 0x5, // Secure (0x1) + HttpOnly (0x4)
      }),
      buildCookieBuffer({
        url: "example.com",
        name: "jwt_token",
        path: "/",
        value: jwt,
        flags: 0x1, // Secure (0x1)
      }),
      buildCookieBuffer({
        url: "example.com",
        name: "encoded_token",
        path: "/encoded",
        value: percentEncoded,
        flags: 0x4, // HttpOnly (0x4)
      }),
      buildCookieBuffer({
        url: ".example.com",
        name: "json_cookie",
        path: "/json",
        value: jsonString,
        flags: 0x0,
      }),
    ];

    const fileBuffer = buildBinaryCookiesFile(cookies);
    writeFileSync(cookieFilePath, fileBuffer);
  });

  afterAll(() => {
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  });

  describe("Layer 1: BinaryCodableCookie.toCookieRow()", () => {
    it("preserves percent-encoded values, JWTs and JSON strings in raw mode", async () => {
      const encBuf = buildCookieBuffer({
        url: "example.com",
        name: "test_encoded",
        path: "/",
        value: percentEncoded,
      });
      const jwtBuf = buildCookieBuffer({
        url: "example.com",
        name: "test_jwt",
        path: "/",
        value: jwt,
      });
      const jsonBuf = buildCookieBuffer({
        url: "example.com",
        name: "test_json",
        path: "/",
        value: jsonString,
      });

      const [rawEnc, rawJwt, rawJson] = await Promise.all([
        withRawCookieValues(async () =>
          new BinaryCodableCookie(encBuf).toCookieRow(),
        ),
        withRawCookieValues(async () =>
          new BinaryCodableCookie(jwtBuf).toCookieRow(),
        ),
        withRawCookieValues(async () =>
          new BinaryCodableCookie(jsonBuf).toCookieRow(),
        ),
      ]);

      expect(rawEnc?.value).toBe(percentEncoded);
      expect(rawJwt?.value).toBe(jwt);
      expect(rawJson?.value).toBe(jsonString);
    });

    it("decodes URL encoding, JSON or JWT in display mode without withRawCookieValues()", () => {
      const encBuf = buildCookieBuffer({
        url: "example.com",
        name: "test_encoded",
        path: "/",
        value: percentEncoded,
      });
      const jsonBuf = buildCookieBuffer({
        url: "example.com",
        name: "test_json",
        path: "/",
        value: jsonString,
      });

      const displayEnc = new BinaryCodableCookie(encBuf).toCookieRow();
      const displayJson = new BinaryCodableCookie(jsonBuf).toCookieRow();

      // Display mode URL-decodes percentEncoded
      expect(displayEnc?.value).toBe("user token=secret&role=admin+write");
      // Display mode parses JSON into an object
      expect(displayJson?.value).toEqual({ user_id: 123, role: "admin" });
    });
  });

  describe("Layer 2: SafariCookieQueryStrategy.queryCookies()", () => {
    it("preserves raw wire values and retains metadata through full strategy query", async () => {
      const strategy = new SafariCookieQueryStrategy();

      const cookies = await withRawCookieValues(async () =>
        strategy.queryCookies("%", "%", cookieFilePath),
      );

      expect(cookies).toHaveLength(4);

      const authCookie = cookies.find((c) => c.name === "auth_token");
      expect(authCookie).toBeDefined();
      expect(authCookie?.value).toBe(rawAuthToken);
      expect(authCookie?.domain).toBe("example.com");
      expect(authCookie?.meta).toMatchObject({
        file: cookieFilePath,
        browser: "Safari",
        decrypted: false,
        secure: true,
        httpOnly: true,
        path: "/api",
        hostOnly: false, // url had leading dot ".example.com"
      });

      const jwtCookie = cookies.find((c) => c.name === "jwt_token");
      expect(jwtCookie).toBeDefined();
      expect(jwtCookie?.value).toBe(jwt);
      expect(jwtCookie?.meta).toMatchObject({
        secure: true,
        httpOnly: false,
        path: "/",
        hostOnly: true, // url had no leading dot "example.com"
      });

      const encCookie = cookies.find((c) => c.name === "encoded_token");
      expect(encCookie).toBeDefined();
      expect(encCookie?.value).toBe(percentEncoded);
      expect(encCookie?.meta).toMatchObject({
        secure: false,
        httpOnly: true,
        path: "/encoded",
        hostOnly: true,
      });

      const jsonCookie = cookies.find((c) => c.name === "json_cookie");
      expect(jsonCookie).toBeDefined();
      expect(jsonCookie?.value).toBe(jsonString);
      expect(jsonCookie?.meta?.hostOnly).toBe(false);
    });

    it("isolates concurrent raw and display queries without cross-talk", async () => {
      const strategy = new SafariCookieQueryStrategy();

      const [rawCookies, displayCookies] = await Promise.all([
        withRawCookieValues(async () =>
          strategy.queryCookies("%", "%", cookieFilePath),
        ),
        strategy.queryCookies("%", "%", cookieFilePath),
      ]);

      const rawEnc = rawCookies.find((c) => c.name === "encoded_token");
      const displayEnc = displayCookies.find((c) => c.name === "encoded_token");

      // Raw mode keeps the percent-encoded string intact
      expect(rawEnc?.value).toBe(percentEncoded);
      expect(rawEnc?.meta?.hostOnly).toBe(true);

      // Display mode URL-decodes the value
      expect(displayEnc?.value).toBe("user token=secret&role=admin+write");
      // Display mode does not include hostOnly
      expect(displayEnc?.meta?.hostOnly).toBeUndefined();
    });
  });
});
