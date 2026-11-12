import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const srcDir = fileURLToPath(new URL("./src", import.meta.url));
const serverOnlyStub = fileURLToPath(new URL("./tests/unit/stubs/server-only.ts", import.meta.url));

/**
 * Dois projetos de teste:
 * - unit: lógica pura (validação, texto, autorização), sem rede nem banco.
 * - db:   migrações, RLS e funções SQL em um PostgreSQL real (veja scripts/test-db.mjs).
 */
export default defineConfig({
  resolve: {
    alias: { "@": srcDir, "server-only": serverOnlyStub },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["tests/unit/**/*.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "db",
          environment: "node",
          include: ["tests/db/**/*.test.ts"],
          // Cada arquivo usa seu próprio banco temporário; serializar evita
          // concorrência na criação de bancos e roles.
          fileParallelism: false,
          testTimeout: 30_000,
          hookTimeout: 60_000,
        },
      },
    ],
  },
});
