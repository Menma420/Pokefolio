import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    ignores: ["src/content/**", "tests/**"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "Literal[value=/^(recruiter|engineer|friend|Acko Clinic|Buy Me A Coffee dApp|PDF Q&A|Mini Port Scanner|NomNom Planner|IoT Weather Monitoring)$/i]",
          message: "Project names and audience literals must only appear in src/content and tests."
        }
      ]
    }
  }
]);

export default eslintConfig;
