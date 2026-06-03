/**
 * Tests for the runtime filesystem adapter abstraction and its
 * Node/Bun implementations.
 */

import { closeSync, mkdtempSync, openSync, rmSync, writeSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
} from "@jest/globals";

import { createBunFileSystemAdapter } from "../BunFileSystemAdapter";
import {
  type FileSystemAdapter,
  getFileSystemAdapter,
  setFileSystemAdapter,
} from "../FileSystemAdapter";
import { createNodeFileSystemAdapter } from "../NodeFileSystemAdapter";

describe("FileSystemAdapter", () => {
  let tmpDir: string;
  let cookFile: string;
  let emptyFile: string;

  beforeAll(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "fs-adapter-"));

    // A file beginning with Safari's "cook" magic bytes followed by padding.
    cookFile = join(tmpDir, "Cookies.binarycookies");
    const fd = openSync(cookFile, "w");
    writeSync(fd, Buffer.from("cookEXTRA", "ascii"), 0, 9, 0);
    closeSync(fd);

    // A zero-byte file to exercise short reads / existence.
    emptyFile = join(tmpDir, "empty");
    closeSync(openSync(emptyFile, "w"));
  });

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  afterEach(() => {
    // Clear any injected adapter so the lazy default is restored between tests.
    setFileSystemAdapter(undefined);
  });

  describe("getFileSystemAdapter (lazy default)", () => {
    it("returns a Node-backed adapter when no adapter is injected", () => {
      const adapter = getFileSystemAdapter();
      expect(adapter.fileExists(cookFile)).toBe(true);
      expect(adapter.fileExists(join(tmpDir, "does-not-exist"))).toBe(false);
    });

    it("returns the injected adapter once one is set", () => {
      const injected: FileSystemAdapter = {
        fileExists: () => false,
        readLeadingBytes: () => null,
        readFile: () => Buffer.alloc(0),
        readTextFile: () => "",
      };
      setFileSystemAdapter(injected);
      expect(getFileSystemAdapter()).toBe(injected);
    });

    it("reverts to the lazy default when the override is cleared", () => {
      const injected: FileSystemAdapter = {
        fileExists: () => false,
        readLeadingBytes: () => null,
        readFile: () => Buffer.alloc(0),
        readTextFile: () => "",
      };
      setFileSystemAdapter(injected);
      expect(getFileSystemAdapter()).toBe(injected);

      setFileSystemAdapter(undefined);
      // Default adapter actually hits disk again.
      expect(getFileSystemAdapter().fileExists(cookFile)).toBe(true);
    });
  });

  describe.each([
    ["NodeFileSystemAdapter", createNodeFileSystemAdapter],
    ["BunFileSystemAdapter", createBunFileSystemAdapter],
  ])("%s", (_name, createAdapter) => {
    const adapter = createAdapter();

    it("reports existence of real and missing files", () => {
      expect(adapter.fileExists(cookFile)).toBe(true);
      expect(adapter.fileExists(join(tmpDir, "nope"))).toBe(false);
    });

    it("reads the requested number of leading bytes", () => {
      const bytes = adapter.readLeadingBytes(cookFile, 4);
      expect(bytes).not.toBeNull();
      expect(bytes?.toString("ascii")).toBe("cook");
    });

    it("returns a short buffer when the file has fewer bytes than requested", () => {
      const bytes = adapter.readLeadingBytes(emptyFile, 4);
      expect(bytes).not.toBeNull();
      expect(bytes?.length).toBe(0);
    });

    it("returns null when the file does not exist", () => {
      expect(adapter.readLeadingBytes(join(tmpDir, "missing"), 4)).toBeNull();
    });

    it("reads an entire file as a Buffer", () => {
      const buf = adapter.readFile(cookFile);
      expect(Buffer.isBuffer(buf)).toBe(true);
      expect(buf.toString("ascii")).toBe("cookEXTRA");
    });

    it("reads an entire file as UTF-8 text", () => {
      expect(adapter.readTextFile(cookFile)).toBe("cookEXTRA");
    });

    it("throws when reading a missing file (load semantics)", () => {
      expect(() => adapter.readFile(join(tmpDir, "missing"))).toThrow();
      expect(() => adapter.readTextFile(join(tmpDir, "missing"))).toThrow();
    });
  });
});
