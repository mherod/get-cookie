import { describe, expect, test } from "@jest/globals";

import { CookieValueSchema } from "../schemas";

describe("CookieValueSchema", () => {
  test("parses common cookie values", () => {
    const testCases = [
      {
        input: "abc123",
        expected: "abc123",
      },
      {
        input: "true",
        expected: true,
      },
      {
        input: "123",
        expected: 123,
      },
      {
        input: '{"user":"john","role":"admin"}',
        expected: { user: "john", role: "admin" },
      },
      {
        input: "[1,2,3]",
        expected: [1, 2, 3],
      },
    ];

    testCases.forEach(({ input, expected }) => {
      expect(CookieValueSchema.parse(input)).toEqual(expected);
    });
  });

  test("handles special cookie values", () => {
    const testCases = [
      {
        input: " abc ",
        expected: "abc",
      },
      {
        input: "null",
        expected: null,
      },
      {
        input: "undefined",
        expected: undefined,
      },
      {
        input: "",
        expected: "",
      },
    ];

    testCases.forEach(({ input, expected }) => {
      expect(CookieValueSchema.parse(input)).toEqual(expected);
    });
  });
});
