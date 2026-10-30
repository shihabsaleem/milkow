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
    ".eslint-report.json",
  ]),

  // ---------------------------------------------------------------------------
  // Pre-existing debt, relaxed from error to warning so CI can gate on lint
  // from day one. A build gate that is red on its first run gets ignored, which
  // is worse than no gate. Each of these is tracked, not ignored:
  //
  //   no-explicit-any          102 - pervasive; the real fix is generated
  //                                Supabase types (types/database.ts is
  //                                hand-written), so every query is `any`.
  //                                Re-enable as error once that lands.
  //   react-hooks/set-state-in-effect  16 - the localStorage cache-hydration
  //                                pattern used by every use*Logic hook
  //                                (hydrate cache -> fetch -> Realtime).
  //                                Intentional. Reworking it is a deliberate
  //                                refactor, not a lint autofix.
  //   react/no-unescaped-entities   8 - unescaped apostrophes in JSX text.
  //                                Purely cosmetic.
  //
  // All three are warnings, so they still surface in `npm run lint` output and
  // in the CI log — they just don't fail the build until they are paid down.
  // ---------------------------------------------------------------------------
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react/no-unescaped-entities": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
]);

export default eslintConfig;
