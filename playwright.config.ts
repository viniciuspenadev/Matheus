import { defineConfig, devices } from "@playwright/test";

/**
 * Testes de interface (Playwright) contra o Supabase SIMULADO de
 * tests/e2e/mock-supabase.mjs. Execute com `npm run test:e2e`, que gera um
 * build isolado em .next-e2e apontando para o simulador.
 *
 * O projeto "iphone" emula viewport, toque e user agent do iPhone 13 Pro Max
 * no Chromium. Isso NÃO substitui o teste no Safari do aparelho (Etapa 5).
 */
const PORT = Number(process.env.E2E_PORT ?? 3100);
const MOCK_PORT = Number(process.env.MOCK_SUPABASE_PORT ?? 54399);

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  outputDir: "test-results",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "off",
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "iphone", use: { ...devices["iPhone 13 Pro Max"], browserName: "chromium" } },
  ],
  webServer: [
    {
      command: "node tests/e2e/mock-supabase.mjs",
      url: `http://127.0.0.1:${MOCK_PORT}/health`,
      env: { MOCK_SUPABASE_PORT: String(MOCK_PORT) },
      reuseExistingServer: false,
      stdout: "ignore",
    },
    {
      command: `node node_modules/next/dist/bin/next start -p ${PORT} -H 127.0.0.1`,
      url: `http://127.0.0.1:${PORT}/login`,
      env: {
        NEXT_DIST_DIR: ".next-e2e",
        ALLOWED_EMAILS: "aluno@exemplo.com",
        NEXT_TELEMETRY_DISABLED: "1",
      },
      timeout: 120_000,
      reuseExistingServer: false,
      stdout: "ignore",
    },
  ],
});
