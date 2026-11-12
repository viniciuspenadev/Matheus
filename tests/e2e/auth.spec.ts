import { expect, test } from "@playwright/test";
import { ALLOWED, REVOKED, formAlert, login, loginAndWait, resetMock } from "./helpers";

test.beforeAll(resetMock);

test("rotas privadas redirecionam para o login preservando o destino", async ({ page }) => {
  await page.goto("/aulas");
  await expect(page).toHaveURL(/\/login\?next=%2Faulas$/);
  await expect(page.getByRole("heading", { name: "StudyFlow AI" })).toBeVisible();
  await expect(page.getByText("Acesso privado. Não há cadastro público.")).toBeVisible();
});

test("respostas incluem cabeçalhos de segurança", async ({ request }) => {
  const res = await request.get("/login");
  expect(res.headers()["x-frame-options"]).toBe("DENY");
  expect(res.headers()["x-content-type-options"]).toBe("nosniff");
  expect(res.headers()["x-powered-by"]).toBeUndefined();
});

test("e-mail fora da lista recebe mensagem genérica", async ({ page }) => {
  await login(page, { email: "intruso@exemplo.com", password: "qualquer" });
  await expect(formAlert(page)).toContainText("E-mail ou senha incorretos, ou acesso não autorizado.");
  await expect(page).toHaveURL(/\/login/);
});

test("conta existente mas revogada (fora de ALLOWED_EMAILS) é bloqueada", async ({ page }) => {
  await login(page, REVOKED);
  await expect(formAlert(page)).toContainText("acesso não autorizado");
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
});

test("senha incorreta é recusada e o e-mail continua preenchido", async ({ page }) => {
  await login(page, { email: ALLOWED.email, password: "errada" });
  await expect(formAlert(page)).toContainText("E-mail ou senha incorretos");
  await expect(page.getByLabel("E-mail")).toHaveValue(ALLOWED.email);
});

test("login autorizado abre o painel; sair encerra a sessão", async ({ page }) => {
  await loginAndWait(page);
  await page.goto("/login");
  await expect(page).toHaveURL(/\/$/); // já autenticado: /login leva ao painel

  await page.getByRole("button", { name: "Sair" }).first().click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/disciplinas");
  await expect(page).toHaveURL(/\/login\?next=%2Fdisciplinas$/);
});

test("após o login, volta para a página solicitada", async ({ page }) => {
  await page.goto("/disciplinas");
  await page.getByLabel("E-mail").fill(ALLOWED.email);
  await page.getByLabel("Senha").fill(ALLOWED.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/disciplinas$/);
  await expect(page.getByRole("heading", { name: "Disciplinas", exact: true })).toBeVisible();
});
