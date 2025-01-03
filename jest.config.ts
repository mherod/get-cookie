module.exports = {
  rootDir: "src",
  moduleFileExtensions: ["js", "ts", "json"],
  moduleNameMapper: {
    "^@utils/(.*)$": "<rootDir>/utils/$1",
    "^@core/(.*)$": "<rootDir>/core/$1",
    "^@tests/(.*)$": "<rootDir>/tests/$1",
  },
  roots: ["<rootDir>"],
  testEnvironment: "node",
  coverageDirectory: "../coverage",
  coverageReporters: ["lcov", "text-summary"],
  testMatch: ["**/__tests__/**/*.[jt]s?(x)", "**/?(*.)+(spec|test).[jt]s?(x)"],
  testPathIgnorePatterns: ["/node_modules/", "/fixtures/", ".*setup\\.[jt]s$"],
  transform: {
    "^.+\\.ts$": "ts-jest",
  },
  setupFiles: ["<rootDir>/../jest.setup.js"],
  collectCoverage: true,
  collectCoverageFrom: [
    "**/*.ts",
    "!**/*.d.ts",
    "!**/__tests__/**",
    "!**/__mocks__/**",
    "!**/fixtures/**",
  ],
  verbose: true,
  reporters: [
    [
      "default",
      {
        verbosity: 3,
        expand: true,
        displayStacktrace: "all",
        showColors: true,
      },
    ],
  ],
  testRunner: "jest-circus/runner",
  testEnvironmentOptions: {
    errorOnDeprecated: true,
  },
  maxWorkers: 1,
  bail: false,
  notify: false,
  notifyMode: "failure-change",
};
