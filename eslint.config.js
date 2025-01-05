import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import importPlugin from "eslint-plugin-import";
import jsdocPlugin from "eslint-plugin-jsdoc";
import globals from "globals";

export default [
  {
    ignores: [
      "dist/**/*",
      "node_modules/**/*",
      "coverage/**/*",
      "docs/.vitepress/cache/**/*",
    ],
  },
  {
    files: ["**/*.js", "**/*.mjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        project: ["./tsconfig.json", "./tsconfig.build.json"],
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.node,
        ...globals.es2022,
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      import: importPlugin,
      jsdoc: jsdocPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...tsPlugin.configs["recommended-requiring-type-checking"].rules,
      ...tsPlugin.configs.strict.rules,
      ...importPlugin.configs.typescript.rules,
      ...jsdocPlugin.configs["recommended-typescript"].rules,
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
          checkConstructors: true,
          checkGetters: true,
          checkSetters: true,
          exemptedBy: ["internal", "private", "test"],
        },
      ],
      "jsdoc/require-description-complete-sentence": "off",
      "jsdoc/check-line-alignment": "error",
      "jsdoc/check-syntax": "error",
      "jsdoc/check-values": "error",
      "jsdoc/check-types": "error",
      "jsdoc/check-property-names": "error",
      "jsdoc/check-indentation": "error",
      "jsdoc/multiline-blocks": "error",
      "jsdoc/require-hyphen-before-param-description": "error",
      "jsdoc/require-throws": "error",
      "jsdoc/require-yields": "error",
      "jsdoc/sort-tags": "error",
      "jsdoc/check-examples": "off",
      "jsdoc/require-example": "off",
      "jsdoc/check-tag-names": [
        "error",
        {
          definedTags: [
            "remarks",
            "internal",
            "private",
            "test",
            "throws",
            "yields",
            "example",
          ],
        },
      ],
      "jsdoc/require-param-type": "off",
      "jsdoc/require-returns-type": "off",
      "jsdoc/require-property": "error",
      "jsdoc/require-property-description": "error",
      "jsdoc/require-property-name": "error",
      "jsdoc/require-property-type": "off",
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
          allowExtraTrailingParamDocs: true,
        },
      ],
      "jsdoc/require-param-description": "error",
      "jsdoc/require-returns-description": "error",
      eqeqeq: ["error", "always"],
      "no-return-await": "error",
      "prefer-const": "error",
      "no-var": "error",
      curly: ["error", "all"],
      "max-depth": ["error", 3],
      "max-lines-per-function": ["error", { max: 50 }],
      complexity: ["error", 10],
      "jsdoc/no-types": "off",
    },
  },
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
      "max-lines-per-function": ["error", { max: 100 }],
    },
  },
];
