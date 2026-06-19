import js from "@eslint/js";
import { globalIgnores } from "eslint/config";
import eslintConfigPrettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";
import pluginReactHooks from "eslint-plugin-react-hooks";
import pluginReact from "eslint-plugin-react";
import globals from "globals";
import pluginNext from "@next/eslint-plugin-next";
import jsxA11y from "eslint-plugin-jsx-a11y";
import { config as baseConfig } from "./base.js";

/**
 * A custom ESLint configuration for libraries that use Next.js.
 *
 * @type {import("eslint").Linter.Config[]}
 * */
export const nextJsConfig = [
  ...baseConfig,
  js.configs.recommended,
  eslintConfigPrettier,
  ...tseslint.configs.recommended,
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    ...pluginReact.configs.flat.recommended,
    languageOptions: {
      ...pluginReact.configs.flat.recommended.languageOptions,
      globals: {
        ...globals.serviceworker,
      },
    },
  },
  {
    plugins: {
      "@next/next": pluginNext,
    },
    rules: {
      ...pluginNext.configs.recommended.rules,
      ...pluginNext.configs["core-web-vitals"].rules,
    },
  },
  {
    plugins: {
      "react-hooks": pluginReactHooks,
    },
    settings: { react: { version: "detect" } },
    rules: {
      ...pluginReactHooks.configs.recommended.rules,
      // React scope no longer necessary with new JSX transform.
      "react/react-in-jsx-scope": "off",
    },
  },
  // Accessibility rules — catches missing aria-labels, bad roles, missing alt text at lint time
  {
    ...jsxA11y.flatConfigs.recommended,
    rules: {
      ...jsxA11y.flatConfigs.recommended.rules,
      "jsx-a11y/alt-text":                        "error",
      "jsx-a11y/label-has-associated-control": "error",
      "jsx-a11y/interactive-supports-focus":       "error",
      "jsx-a11y/role-has-required-aria-props":     "error",
      "jsx-a11y/no-autofocus":                     "warn",
      "jsx-a11y/anchor-is-valid":                  "error",
      "jsx-a11y/click-events-have-key-events":     "warn",
      "jsx-a11y/no-noninteractive-element-interactions": "warn",
    },
  },
];
