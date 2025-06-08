import { DefaultOutputHandler } from "../DefaultOutputHandler";
import { DumpOutputHandler } from "../DumpOutputHandler";
import { JsonOutputHandler } from "../JsonOutputHandler";
import { OutputHandlerFactory } from "../OutputHandlerFactory";

describe("OutputHandlerFactory", () => {
  let factory: OutputHandlerFactory;

  beforeEach(() => {
    factory = new OutputHandlerFactory();
  });

  describe("getHandler", () => {
    it("should return JsonOutputHandler for valid json output format", () => {
      const handler = factory.getHandler({ output: "json" });
      expect(handler).toBeInstanceOf(JsonOutputHandler);
    });

    it("should return DumpOutputHandler for dump flag", () => {
      const handler = factory.getHandler({ dump: true });
      expect(handler).toBeInstanceOf(DumpOutputHandler);
    });

    it("should return DefaultOutputHandler when no specific format requested", () => {
      const handler = factory.getHandler({});
      expect(handler).toBeInstanceOf(DefaultOutputHandler);
    });

    it("should throw error for invalid output format", () => {
      expect(() => {
        factory.getHandler({ output: "invalid" });
      }).toThrow("Invalid output format: 'invalid'. Valid formats are: json");
    });

    it("should throw error for unsupported output format", () => {
      expect(() => {
        factory.getHandler({ output: "xml" });
      }).toThrow("Invalid output format: 'xml'. Valid formats are: json");
    });

    it("should throw error for empty string output format", () => {
      expect(() => {
        factory.getHandler({ output: "" });
      }).toThrow("Invalid output format: ''. Valid formats are: json");
    });

    it("should handle valid json format case-sensitively", () => {
      expect(() => {
        factory.getHandler({ output: "JSON" });
      }).toThrow("Invalid output format: 'JSON'. Valid formats are: json");
    });

    it("should not validate when output is undefined", () => {
      expect(() => {
        factory.getHandler({ output: undefined });
      }).not.toThrow();
    });

    it("should not validate when output property is not present", () => {
      expect(() => {
        factory.getHandler({ dump: true });
      }).not.toThrow();
    });
  });
});
