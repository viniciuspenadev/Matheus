import { expect, type Locator, type Page } from "@playwright/test";

const MOCK_URL = `http://127.0.0.1:${process.env.MOCK_SUPABASE_PORT ?? 54399}`;

export const ALLOWED = { email: "aluno@exemplo.com", password: "senha-correta" };
export const REVOKED = { email: "revogado@exemplo.com", password: "senha-correta" };

/** Restaura os dados iniciais do Supabase simulado. */
export async function resetMock(): Promise<void> {
  const res = await fetch(`${MOCK_URL}/__reset`);
  if (!res.ok) throw new Error("Falha ao reiniciar o Supabase simulado");
}

export async function login(page: Page, creds = ALLOWED, path = "/login"): Promise<void> {
  await page.goto(path);
  await page.getByLabel("E-mail").fill(creds.email);
  await page.getByLabel("Senha").fill(creds.password);
  await page.getByRole("button", { name: "Entrar" }).click();
}

export async function loginAndWait(page: Page): Promise<void> {
  await login(page);
  await expect(page.getByRole("heading", { name: "Painel de estudos" })).toBeVisible();
}

/** Mensagem de erro do formulário (exclui o anunciador de rotas do Next.js). */
export function formAlert(page: Page): Locator {
  return page.locator("main form [role=alert], main [role=alert]:not(#__next-route-announcer__)").first();
}

/** Mensagem de sucesso do formulário. */
export function formStatus(page: Page): Locator {
  return page.locator("main [role=status][aria-live]").first();
}
