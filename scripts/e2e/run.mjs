#!/usr/bin/env node
/**
 * Executa os testes de interface (Playwright) contra o Supabase SIMULADO.
 * 1. Gera um build isolado em .next-e2e com as variáveis públicas do simulador
 *    (variáveis NEXT_PUBLIC_* são embutidas no build).
 * 2. Roda o Playwright, que sobe o simulador e o `next start`.
 *
 * Argumentos extras são repassados ao Playwright (ex.: --project=iphone).
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const mockPort = process.env.MOCK_SUPABASE_PORT ?? "54399";

const env = {
  ...process.env,
  NEXT_DIST_DIR: ".next-e2e",
  NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${mockPort}`,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_mock_key_for_e2e_tests",
  NEXT_TELEMETRY_DISABLED: "1",
};

if (!process.argv.includes("--skip-build")) {
  console.log("Gerando build isolado para E2E (.next-e2e)...");
  const build = spawnSync(process.execPath, [path.join(root, "node_modules/next/dist/bin/next"), "build"], {
    cwd: root,
    env,
    stdio: "inherit",
  });
  if (build.status !== 0) process.exit(build.status ?? 1);
}

const args = process.argv.slice(2).filter((a) => a !== "--skip-build");
const result = spawnSync(
  process.execPath,
  [path.join(root, "node_modules/@playwright/test/cli.js"), "test", "--trace", "off", ...args],
  { cwd: root, env, stdio: "inherit" },
);
process.exit(result.status ?? 1);
