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
    // Relatorio de cobertura, gerado pelo vitest. Nao e codigo-fonte: o
    // proprio gerador escreve diretivas `eslint-disable` que aqui aparecem
    // como "unused directive", um aviso sobre um arquivo que ninguem edita.
    "coverage/**",
  ]),
]);

export default eslintConfig;
