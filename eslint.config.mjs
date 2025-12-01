import nextConfig from "eslint-config-next";
import tseslint from "@typescript-eslint/eslint-plugin";

const eslintConfig = [
  {
    ignores: [
      "gigaverse-backend/**",
      "node_modules/**",
      ".cursor/**",
      "agent-tools/**"
    ],
  },
  ...nextConfig,
  {
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: {
      // Downgrade noisy rules to warnings so builds don't fail while we iteratively clean up
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }
      ],
      "prefer-const": "warn",
      "react-hooks/exhaustive-deps": "warn",
      "@next/next/no-img-element": "off",
      "react/no-unescaped-entities": "off",
      "@typescript-eslint/no-unsafe-function-type": "warn",
    },
  },
];

export default eslintConfig;
