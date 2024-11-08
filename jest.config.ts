module.exports = {
  rootDir: "src",
  moduleFileExtensions: ["js", "ts", "json"],
  moduleNameMapper: {
    "lodash-es": "lodash",
  },
  roots: ["<rootDir>"],
  testEnvironment: "node",
  coverageReporters: ["lcov", "text-summary"],
  testMatch: ["**/__tests__/**/*.[jt]s?(x)", "**/?(*.)+(spec|test).[jt]s?(x)"],
  transform: {
    "^.+\\.ts$": "ts-jest",
  },
};

