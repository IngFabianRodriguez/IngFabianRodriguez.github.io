import js from "@eslint/js";
import globals from "globals";
import jsxA11y from "eslint-plugin-jsx-a11y";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

// Native elements that shadcn/ui already provides. Only src/components/ui may use them.
const shadcnOnly = ["button", "input", "select", "textarea", "label", "table"];

export default tseslint.config(
  { ignores: ["dist", "samples", ".agent-generated"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  react.configs.flat.recommended,
  react.configs.flat["jsx-runtime"],
  jsxA11y.flatConfigs.recommended,
  { settings: { react: { version: "detect" } } },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: { globals: globals.browser },
    plugins: { "react-hooks": reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "no-console": "warn",
      "react/prop-types": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/components/ui/**"],
    rules: {
      "no-restricted-syntax": [
        "error",
        ...shadcnOnly.map((tag) => ({
          selector: `JSXOpeningElement[name.name='${tag}']`,
          message: `Use the shadcn/ui component from @/components/ui instead of a native <${tag}>.`,
        })),
      ],
    },
  },
);
