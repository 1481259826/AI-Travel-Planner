import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // 忽略的文件和目录
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/out/**",
      "**/build/**",
      "**/dist/**",
      "**/public/sw.js",
      "**/public/workbox-*.js",
      "**/.git/**",
      "**/coverage/**",
      "**/*.config.js",
      "**/*.config.mjs",
    ],
  },

  // 扩展 Next.js 推荐配置
  ...compat.extends("next/core-web-vitals", "next/typescript"),

  // 自定义规则
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    rules: {
      // TypeScript 规则（严格模式）
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "warn", // 保留为警告（太多需要修改）
      "@typescript-eslint/no-non-null-assertion": "warn",
      "@typescript-eslint/no-empty-object-type": "error", // 恢复为错误
      "@typescript-eslint/no-require-imports": "error", // 恢复为错误

      // React 规则（严格模式）
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "react/no-unescaped-entities": "error", // 恢复为错误
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // Next.js 规则（严格模式）
      "@next/next/no-html-link-for-pages": "error", // 恢复为错误
      "@next/next/no-img-element": "warn",

      // 通用规则
      "no-console": ["warn", { allow: ["warn", "error", "info"] }],
      "no-debugger": "warn",
      "prefer-const": "warn",
      "no-var": "error",

      // 代码风格（保持现有风格）
      "semi": "off",
      "quotes": "off",
      "comma-dangle": "off",
      "object-curly-spacing": "off",
      "array-bracket-spacing": "off",
    },
  },
];

export default eslintConfig;
