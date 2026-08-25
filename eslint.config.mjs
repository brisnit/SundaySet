import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

/** @type {import('eslint').Linter.Config[]} */
const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "src/generated/**",
      "next-env.d.ts",
      ".uploads/**",
      // iCloud Drive syncs ~/Desktop and leaves "file 2.ts" conflict copies
      // when Next rewrites .next/types rapidly. They are not source.
      "**/* 2.ts",
      "**/* 2.tsx",
    ],
  },
  ...coreWebVitals,
  ...typescript,
];

export default eslintConfig;
