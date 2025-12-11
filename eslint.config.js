import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";

export default [
  {
    files: ["**/*.ts"],

    ignores: [
      "dist/**",
      "**/*.md",
      "**/*.json",
      "**/*.yml",
      "**/*.yaml",
      ".github/**"
    ],

    languageOptions: {
      parser: tsParser,
      ecmaVersion: "latest",
      sourceType: "module"
    },

    plugins: {
      "@typescript-eslint": tsPlugin
    },

    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "no-console": "off",
      "no-unused-vars": "off"
    }
  }
];
