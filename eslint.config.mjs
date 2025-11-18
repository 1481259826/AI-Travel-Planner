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
    rules: {
      // TypeScript 规则
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-non-null-assertion": "warn",

      // React 规则
      "react/react-in-jsx-scope": "off", // Next.js 不需要
      "react/prop-types": "off", // 使用 TypeScript
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // Next.js 规则
      "@next/next/no-html-link-for-pages": "error",
      "@next/next/no-img-element": "warn",

      // 通用规则
      "no-console": ["warn", { allow: ["warn", "error", "info"] }],
      "no-debugger": "warn",
      "prefer-const": "warn",
      "no-var": "error",

      // 代码风格（保持现有风格，不强制修改）
      "semi": "off", // 关闭分号检查，保持现有风格
      "quotes": "off", // 关闭引号检查
      "comma-dangle": "off", // 关闭尾随逗号检查
      "object-curly-spacing": "off",
      "array-bracket-spacing": "off",
    },
  },
];

export default eslintConfig;
