const lodash = require("lodash");

jest.mock("lodash-es", () => lodash);
jest.mock("lodash-es/merge", () => require("lodash/merge"));
jest.mock("lodash-es/memoize", () => require("lodash/memoize"));
jest.mock("lodash-es/uniqBy", () => require("lodash/uniqBy"));

// Mock the logger
jest.mock("@utils/logger");

// Add any other global setup here
