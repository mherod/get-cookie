module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "import", "jsdoc"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "plugin:@typescript-eslint/strict",
    "plugin:import/typescript",
    "plugin:jsdoc/recommended-typescript",
  ],
  env: {
    node: true,
    es2022: true,
  },
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
    project: ["./tsconfig.json", "./tsconfig.build.json"],
    tsconfigRootDir: __dirname,
  },
  ignorePatterns: ["dist/**/*", "node_modules/**/*", ".eslintrc.js"],
  rules: {
    "@typescript-eslint/explicit-function-return-type": [
      "error",
      {
        allowExpressions: true,
        allowTypedFunctionExpressions: true,
      },
    ],
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/explicit-member-accessibility": [
      "error",
      {
        accessibility: "explicit",
      },
    ],
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/no-misused-promises": "error",
    "@typescript-eslint/await-thenable": "error",
    "@typescript-eslint/no-unnecessary-type-assertion": "error",
    "@typescript-eslint/prefer-nullish-coalescing": "error",
    "@typescript-eslint/prefer-optional-chain": "error",
    "@typescript-eslint/strict-boolean-expressions": "error",
    "@typescript-eslint/no-unnecessary-condition": "error",
    "import/order": [
      "error",
      {
        groups: [
          "builtin",
          "external",
          "internal",
          "parent",
          "sibling",
          "index",
        ],
        pathGroups: [
          {
            pattern: "@core/**",
            group: "internal",
          },
          {
            pattern: "@utils/**",
            group: "internal",
          },
          {
            pattern: "@/**",
            group: "internal",
          },
        ],
        pathGroupsExcludedImportTypes: ["builtin"],
        "newlines-between": "always",
        alphabetize: { order: "asc", caseInsensitive: true },
      },
    ],
    "import/newline-after-import": "error",
    "no-prototype-builtins": "error",
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        destructuredArrayIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      },
    ],
    "no-useless-catch": "error",
    "@typescript-eslint/ban-ts-comment": [
      "error",
      {
        "ts-expect-error": "allow-with-description",
        "ts-ignore": false,
        "ts-nocheck": false,
        "ts-check": false,
        minimumDescriptionLength: 10,
      },
    ],
    "jsdoc/require-jsdoc": [
      "error",
      {
        publicOnly: true,
        require: {
          ArrowFunctionExpression: true,
          ClassDeclaration: true,
          ClassExpression: true,
          FunctionDeclaration: true,
          MethodDefinition: true,
        },
        contexts: [
          "ExportDefaultDeclaration",
          "ExportNamedDeclaration",
          "TSInterfaceDeclaration",
          "TSTypeAliasDeclaration",
          "TSEnumDeclaration",
          "PropertyDefinition",
        ],
      },
    ],
    "jsdoc/require-description": [
      "error",
      {
        contexts: ["any"],
        checkConstructors: false,
        checkGetters: false,
        checkSetters: false,
        exemptedBy: ["internal", "private", "test"],
      },
    ],
    "jsdoc/require-param-type": "off",
    "jsdoc/require-returns-type": "off",
    "jsdoc/require-returns": [
      "error",
      {
        checkGetters: true,
        checkConstructors: false,
      },
    ],
    "jsdoc/check-param-names": [
      "error",
      {
        checkRestProperty: true,
        enableFixer: true,
      },
    ],
    "jsdoc/require-param-description": "error",
    "jsdoc/require-returns-description": "error",
    "jsdoc/require-throws": "error",
    "jsdoc/require-example": [
      "error",
      {
        contexts: [
          "ExportDefaultDeclaration",
          "ExportNamedDeclaration:not(TSTypeAliasDeclaration)",
          "ExportNamedDeclaration:not(TSInterfaceDeclaration)",
        ],
        exemptedBy: ["internal", "private", "test"],
        exemptNoArguments: true,
        checkConstructors: false,
        checkGetters: false,
        checkSetters: false,
      },
    ],
    "jsdoc/check-examples": "off",
    "jsdoc/check-tag-names": [
      "error",
      {
        definedTags: ["remarks", "internal", "private", "test"],
      },
    ],
    "jsdoc/no-undefined-types": "error",
    "jsdoc/tag-lines": [
      "error",
      "any",
      {
        startLines: 1,
        endLines: 0,
        applyToEndTag: false,
      },
    ],
    "no-console": "warn",
    eqeqeq: ["error", "always"],
    "no-return-await": "error",
    "prefer-const": "error",
    "no-var": "error",
    curly: ["error", "all"],
    "max-depth": ["error", 3],
    "max-lines-per-function": ["error", { max: 50 }],
    complexity: ["error", 10],
  },
  overrides: [
    {
      files: [
        "**/__tests__/**",
        "**/__mocks__/**",
        "**/tests/**",
        "**/utils/**",
        "**/types/**",
        "**/browsers/**",
      ],
      rules: {
        "jsdoc/require-example": "off",
        "jsdoc/require-description": "off",
      },
    },
  ],
  settings: {
    "import/resolver": {
      typescript: {
        alwaysTryTypes: true,
        project: ["./tsconfig.json", "./tsconfig.build.json"],
      },
    },
  },
};
