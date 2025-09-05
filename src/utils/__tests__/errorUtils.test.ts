import {
  ensureError,
  errorMessageContains,
  formatErrorForLogging,
  getDatabaseErrorType,
  getErrorDetails,
  getErrorMessage,
  hasErrorMessage,
  isError,
  retryWithBackoff,
  withErrorHandling,
} from "../errorUtils";

describe("errorUtils", () => {
  describe("getErrorMessage", () => {
    it("should extract message from Error instance", () => {
      const error = new Error("Test error message");
      expect(getErrorMessage(error)).toBe("Test error message");
    });

    it("should return string directly if error is string", () => {
      expect(getErrorMessage("String error")).toBe("String error");
    });

    it("should extract message from object with message property", () => {
      const errorLike = { message: "Custom error", code: 500 };
      expect(getErrorMessage(errorLike)).toBe("Custom error");
    });

    it("should convert null to string", () => {
      expect(getErrorMessage(null)).toBe("null");
    });

    it("should convert undefined to string", () => {
      expect(getErrorMessage(undefined)).toBe("undefined");
    });

    it("should convert number to string", () => {
      expect(getErrorMessage(404)).toBe("404");
    });

    it("should convert object without message to string", () => {
      expect(getErrorMessage({ code: 500 })).toBe("[object Object]");
    });

    it("should handle Error with empty message", () => {
      const error = new Error("");
      expect(getErrorMessage(error)).toBe("");
    });
  });

  describe("getErrorDetails", () => {
    it("should extract full details from Error instance", () => {
      const error = new Error("Test error");
      error.name = "CustomError";
      const details = getErrorDetails(error);

      expect(details.message).toBe("Test error");
      expect(details.name).toBe("CustomError");
      expect(details.stack).toBeDefined();
      expect(details.code).toBeUndefined();
    });

    it("should extract code from Error with code property", () => {
      const error = new Error("Test error") as Error & { code: string };
      error.code = "ENOENT";
      const details = getErrorDetails(error);

      expect(details.code).toBe("ENOENT");
    });

    it("should return only message for non-Error values", () => {
      const details = getErrorDetails("String error");

      expect(details.message).toBe("String error");
      expect(details.stack).toBeUndefined();
      expect(details.name).toBeUndefined();
    });

    it("should handle null", () => {
      const details = getErrorDetails(null);
      expect(details.message).toBe("null");
      expect(details.stack).toBeUndefined();
    });
  });

  describe("errorMessageContains", () => {
    it("should find text in error message (case-insensitive)", () => {
      const error = new Error("Database is LOCKED");
      expect(errorMessageContains(error, "locked")).toBe(true);
      expect(errorMessageContains(error, "LOCKED")).toBe(true);
      expect(errorMessageContains(error, "database")).toBe(true);
    });

    it("should return false when text not found", () => {
      const error = new Error("File not found");
      expect(errorMessageContains(error, "locked")).toBe(false);
    });

    it("should work with string errors", () => {
      expect(errorMessageContains("Permission denied", "permission")).toBe(
        true,
      );
      expect(errorMessageContains("Permission denied", "locked")).toBe(false);
    });

    it("should handle empty search text", () => {
      const error = new Error("Any message");
      expect(errorMessageContains(error, "")).toBe(true);
    });

    it("should handle null and undefined", () => {
      expect(errorMessageContains(null, "test")).toBe(false);
      expect(errorMessageContains(undefined, "test")).toBe(false);
    });
  });

  describe("getDatabaseErrorType", () => {
    it("should detect locked database errors", () => {
      expect(getDatabaseErrorType(new Error("database is locked"))).toBe(
        "locked",
      );
      expect(getDatabaseErrorType(new Error("Database locked"))).toBe("locked");
      expect(getDatabaseErrorType(new Error("SQLITE_BUSY"))).toBe("locked");
    });

    it("should detect busy errors", () => {
      expect(getDatabaseErrorType(new Error("Resource busy"))).toBe("busy");
      expect(getDatabaseErrorType(new Error("File is busy"))).toBe("busy");
    });

    it("should detect permission errors", () => {
      expect(
        getDatabaseErrorType(new Error("EPERM: operation not permitted")),
      ).toBe("permission");
      expect(getDatabaseErrorType(new Error("Permission denied"))).toBe(
        "permission",
      );
      expect(getDatabaseErrorType(new Error("EACCES: permission denied"))).toBe(
        "permission",
      );
    });

    it("should detect not found errors", () => {
      expect(getDatabaseErrorType(new Error("ENOENT: no such file"))).toBe(
        "not_found",
      );
      expect(getDatabaseErrorType(new Error("File not found"))).toBe(
        "not_found",
      );
    });

    it("should return null for unrecognized errors", () => {
      expect(getDatabaseErrorType(new Error("Unknown error"))).toBe(null);
      expect(getDatabaseErrorType("Random string")).toBe(null);
    });

    it("should handle null and undefined", () => {
      expect(getDatabaseErrorType(null)).toBe(null);
      expect(getDatabaseErrorType(undefined)).toBe(null);
    });
  });

  describe("formatErrorForLogging", () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it("should format error with context", () => {
      const error = new Error("Test error");
      error.name = "CustomError";
      const result = formatErrorForLogging(error, { userId: 123 });

      expect(result.error).toBe("Test error");
      expect(result.errorName).toBe("CustomError");
      expect(result.userId).toBe(123);
    });

    it("should include stack in non-production", () => {
      process.env.NODE_ENV = "development";
      const error = new Error("Test error");
      const result = formatErrorForLogging(error);

      expect(result.errorStack).toBeDefined();
    });

    it("should exclude stack in production", () => {
      process.env.NODE_ENV = "production";
      const error = new Error("Test error");
      const result = formatErrorForLogging(error);

      expect(result.errorStack).toBeUndefined();
    });

    it("should handle non-Error values", () => {
      const result = formatErrorForLogging("String error", { action: "test" });

      expect(result.error).toBe("String error");
      expect(result.errorName).toBeUndefined();
      expect(result.action).toBe("test");
    });
  });

  describe("isError", () => {
    it("should return true for Error instances", () => {
      expect(isError(new Error("test"))).toBe(true);
      expect(isError(new TypeError("test"))).toBe(true);
      expect(isError(new RangeError("test"))).toBe(true);
    });

    it("should return false for non-Error values", () => {
      expect(isError("string")).toBe(false);
      expect(isError(123)).toBe(false);
      expect(isError({ message: "error" })).toBe(false);
      expect(isError(null)).toBe(false);
      expect(isError(undefined)).toBe(false);
    });
  });

  describe("hasErrorMessage", () => {
    it("should return true for objects with message property", () => {
      expect(hasErrorMessage({ message: "test" })).toBe(true);
      expect(hasErrorMessage({ message: null })).toBe(true);
      expect(hasErrorMessage({ message: undefined })).toBe(true);
      expect(hasErrorMessage(new Error("test"))).toBe(true);
    });

    it("should return false for objects without message property", () => {
      expect(hasErrorMessage({ code: 500 })).toBe(false);
      expect(hasErrorMessage("string")).toBe(false);
      expect(hasErrorMessage(123)).toBe(false);
      expect(hasErrorMessage(null)).toBe(false);
      expect(hasErrorMessage(undefined)).toBe(false);
    });
  });

  describe("ensureError", () => {
    it("should return Error instance unchanged", () => {
      const error = new Error("Original error");
      const result = ensureError(error);
      expect(result).toBe(error);
    });

    it("should convert string to Error", () => {
      const result = ensureError("String error");
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe("String error");
    });

    it("should convert object with message to Error", () => {
      const result = ensureError({ message: "Object error" });
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe("Object error");
    });

    it("should use fallback message for null/undefined", () => {
      const result1 = ensureError(null);
      expect(result1.message).toBe("null");

      const result2 = ensureError(undefined, "Custom fallback");
      expect(result2.message).toBe("undefined");
    });

    it("should preserve original error as cause if supported", () => {
      const originalError = { code: 500, message: "Server error" };
      const result = ensureError(originalError);

      if ("cause" in result) {
        expect(result.cause).toBe(originalError);
      }
    });
  });

  describe("withErrorHandling", () => {
    it("should return result on success", async () => {
      const operation = jest.fn().mockResolvedValue("success");
      const errorHandler = jest.fn();

      const result = await withErrorHandling(operation, errorHandler);

      expect(result).toBe("success");
      expect(operation).toHaveBeenCalled();
      expect(errorHandler).not.toHaveBeenCalled();
    });

    it("should handle errors and return undefined", async () => {
      const error = new Error("Operation failed");
      const operation = jest.fn().mockRejectedValue(error);
      const errorHandler = jest.fn();

      const result = await withErrorHandling(operation, errorHandler);

      expect(result).toBeUndefined();
      expect(operation).toHaveBeenCalled();
      expect(errorHandler).toHaveBeenCalledWith(error);
    });
  });

  describe("retryWithBackoff", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("should succeed on first attempt", async () => {
      const operation = jest.fn().mockResolvedValue("success");

      const promise = retryWithBackoff(operation);
      const result = await promise;

      expect(result).toBe("success");
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it("should retry on failure and eventually succeed", async () => {
      jest.useRealTimers(); // Use real timers for this test

      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error("Attempt 1"))
        .mockRejectedValueOnce(new Error("Attempt 2"))
        .mockResolvedValue("success");

      const result = await retryWithBackoff(operation, {
        maxAttempts: 3,
        initialDelay: 10,
        maxDelay: 50,
      });

      expect(result).toBe("success");
      expect(operation).toHaveBeenCalledTimes(3);

      jest.useFakeTimers(); // Restore fake timers
    }, 10000);

    it("should throw after max attempts", async () => {
      const error = new Error("Persistent failure");
      const operation = jest.fn().mockRejectedValue(error);

      const promise = retryWithBackoff(operation, { maxAttempts: 2 });

      // First attempt
      await Promise.resolve();

      // Second attempt after delay
      jest.advanceTimersByTime(100);
      await Promise.resolve();

      await expect(promise).rejects.toThrow("Persistent failure");
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it("should respect shouldRetry option", async () => {
      const permanentError = new Error("PERMANENT");
      const temporaryError = new Error("TEMPORARY");

      const operation = jest
        .fn()
        .mockRejectedValueOnce(temporaryError)
        .mockRejectedValueOnce(permanentError);

      const shouldRetry = (error: unknown) => {
        return !getErrorMessage(error).includes("PERMANENT");
      };

      const promise = retryWithBackoff(operation, { shouldRetry });

      // First attempt with temporary error - will retry
      await Promise.resolve();
      expect(operation).toHaveBeenCalledTimes(1);

      // Second attempt with permanent error - won't retry
      jest.advanceTimersByTime(100);
      await Promise.resolve();

      await expect(promise).rejects.toThrow("PERMANENT");
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it("should use exponential backoff with max delay", async () => {
      jest.useRealTimers(); // Use real timers for this test

      const operation = jest.fn().mockRejectedValue(new Error("Fail"));

      await expect(
        retryWithBackoff(operation, {
          maxAttempts: 4,
          initialDelay: 10,
          maxDelay: 30,
        }),
      ).rejects.toThrow("Fail");

      expect(operation).toHaveBeenCalledTimes(4);

      jest.useFakeTimers(); // Restore fake timers
    }, 10000);
  });
});
