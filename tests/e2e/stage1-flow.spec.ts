/**
 * Critério de conclusão da Etapa 1, na interface: entrar, cadastrar uma
 * disciplina, criar uma aula e salvar uma transcrição (TXT e texto colado),
 * revisar e restaurar a transcrição. Executado contra o Supabase simulado.
 */
import { expect, test, type Page } from "@playwright/test";
import { formAlert, formStatus, loginAndWait, resetMock } from "./helpers";

test.describe.configure({ mode: "serial" });

const SUBJECT = "Química Geral E2E";
const TRANSCRIPT_TXT =
  "Hoje estudaremos estequiometria.\r\n\r\n\r\nUm mol contém 6,022 × 10²³ entidades.\r\nA massa molar da água é 18 g/mol.";

let page: Page;

test.beforeAll(async ({ browser }) => {
  await resetMock();
  page = await browser.newPage();
  await loginAndWait(page);
});

test.afterAll(async () => {
  await page.close();
});

test("cadastra disciplina com vocabulário científico", async () => {
  await page.goto("/disciplinas/nova");
  await page.getByLabel("Nome da disciplina").fill(SUBJECT);
  await page.getByLabel("Código").fill("QG100");
  await page.getByLabel("Professor(a)").fill("Prof. Carlos");
  await page.getByLabel("Curso").selectOption({ label: "Biotecnologia" });
  await page.getByLabel("Vocabulário científico").fill("estequiometria, mol\nmassa molar, Mol");
  await page.getByRole("button", { name: "Cadastrar disciplina" }).click();

  await expect(page.getByRole("heading", { name: SUBJECT })).toBeVisible();
  const vocab = page.locator("section", { hasText: "Vocabulário científico" });
  await expect(vocab.getByRole("listitem")).toHaveText(["estequiometria", "mol", "massa molar"]);
});

test("valida campos obrigatórios e nome duplicado", async () => {
  await page.goto("/disciplinas/nova");
  await page.getByRole("button", { name: "Cadastrar disciplina" }).click();
  await expect(page.getByText("Informe o nome da disciplina.")).toBeVisible();

  await page.getByLabel("Nome da disciplina").fill(SUBJECT.toLowerCase());
  await page.getByRole("button", { name: "Cadastrar disciplina" }).click();
  await expect(formAlert(page)).toContainText("Já existe uma disciplina com esse nome.");
  await expect(page.getByLabel("Nome da disciplina")).toHaveValue(SUBJECT.toLowerCase());
});

test("edita a disciplina", async () => {
  await page.goto("/disciplinas");
  await page.getByRole("link", { name: new RegExp(SUBJECT) }).click();
  await page.getByRole("link", { name: "Editar" }).click();
  await page.getByLabel("Professor(a)").fill("Profa. Beatriz");
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(page.getByRole("heading", { name: SUBJECT })).toBeVisible();
  await expect(page.getByText("Profa. Beatriz")).toBeVisible();
});

test("cria aula em rascunho e importa um arquivo TXT", async () => {
  await page.getByRole("link", { name: "Nova aula" }).click();
  await expect(page.getByLabel("Disciplina")).toHaveValue(/.+/); // pré-selecionada
  await page.getByLabel("Título da aula").fill("Aula 2 — Estequiometria");
  await page.getByLabel("Data da aula").fill("2026-11-10");
  await page.getByRole("button", { name: "Criar aula" }).click();

  await expect(page.getByRole("heading", { name: "Aula 2 — Estequiometria" })).toBeVisible();
  await expect(page.getByText("Sem conteúdo")).toBeVisible();

  await page.getByLabel("Arquivo de transcrição").setInputFiles({
    name: "aula2.txt",
    mimeType: "text/plain",
    buffer: Buffer.from(TRANSCRIPT_TXT, "utf8"),
  });
  await expect(page.getByText("aula2.txt", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Importar transcrição" }).click();

  await expect(page.getByText(/Transcrição salva com segurança/)).toBeVisible();
  await expect(page.getByText("Transcrita", { exact: true })).toBeVisible();
  const article = page.getByRole("article", { name: "Transcrição" });
  await expect(article).toContainText("Um mol contém 6,022 × 10²³ entidades.");
  // Linhas em branco excedentes e CRLF foram normalizados; palavras preservadas.
  expect(await article.innerText()).toBe(
    "Hoje estudaremos estequiometria.\n\nUm mol contém 6,022 × 10²³ entidades.\nA massa molar da água é 18 g/mol.",
  );
});

test("revisa a transcrição preservando o original e depois restaura", async () => {
  await page.getByRole("button", { name: "Editar" }).click();
  const editor = page.getByLabel("Texto da transcrição revisada");
  await editor.fill("Hoje estudaremos estequiometria (revisado).\n\nUm mol contém 6,022 × 10²³ entidades.");
  await page.getByRole("button", { name: "Salvar versão revisada" }).click();

  await expect(formStatus(page)).toContainText("Versão revisada salva");
  await expect(page.getByRole("tab", { name: "Revisada" })).toHaveAttribute("aria-selected", "true");
  const article = page.getByRole("article", { name: "Transcrição" });
  await expect(article).toContainText("(revisado)");

  await page.getByRole("tab", { name: "Original" }).click();
  await expect(article).not.toContainText("(revisado)");
  await expect(article).toContainText("A massa molar da água é 18 g/mol.");

  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Restaurar original" }).click();
  await expect(formStatus(page)).toContainText("Exibindo a transcrição original");
  await expect(page.getByRole("tab", { name: "Revisada" })).toHaveCount(0);
});

test("importa transcrição colada criando uma nova aula", async () => {
  await page.goto("/importar");
  await page.getByLabel("Disciplina").selectOption({ label: SUBJECT });
  await page.getByLabel("Título da aula").fill("Aula 3 — Soluções");
  await page.getByRole("radio", { name: "Colar texto" }).click();
  const textarea = page.getByLabel("Texto da transcrição");
  await textarea.fill("Concentração molar é a razão entre mols de soluto e o volume da solução em litros.");
  await expect(page.getByText(/16 palavras/)).toBeVisible();
  await page.getByRole("button", { name: "Importar transcrição" }).click();

  await expect(page.getByRole("heading", { name: "Aula 3 — Soluções" })).toBeVisible();
  await expect(page.getByText("Texto colado", { exact: true })).toBeVisible();
});

test("lista e filtra aulas por disciplina", async () => {
  await page.goto("/aulas");
  await page.getByLabel("Disciplina").selectOption({ label: SUBJECT });
  await page.getByRole("button", { name: "Filtrar" }).click();
  await expect(page.getByText("2 aulas")).toBeVisible();
  await expect(page.getByRole("link", { name: /Aula 2 — Estequiometria/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Introdução às enzimas/ })).toHaveCount(0);
});

test("protege a disciplina com aulas e exclui uma aula", async () => {
  await page.goto("/disciplinas");
  await page.getByRole("link", { name: new RegExp(SUBJECT) }).click();
  await expect(page.getByText(/Para proteger suas transcrições/)).toBeVisible();

  await page.getByRole("link", { name: /Aula 3 — Soluções/ }).click();
  await page.getByRole("link", { name: "Editar dados" }).click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Excluir aula" }).click();
  await expect(page).toHaveURL(/\/aulas$/);
  await expect(page.getByRole("link", { name: /Aula 3 — Soluções/ })).toHaveCount(0);
});

test("painel mostra totais, pendências e transcrições recentes", async () => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Painel de estudos" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Disciplinas\s*2/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Transcrições\s*2/ })).toBeVisible();
  await expect(page.locator("section", { hasText: "Transcrições recentes" })).toContainText("Aula 2 — Estequiometria");
  await page.screenshot({ path: `test-results/screens/painel-${test.info().project.name}.png`, fullPage: true });
});

test("capturas para revisão visual", async () => {
  await page.goto("/disciplinas");
  await page.screenshot({ path: `test-results/screens/disciplinas-${test.info().project.name}.png`, fullPage: true });
  await page.goto("/aulas");
  await page.getByRole("link", { name: /Aula 2 — Estequiometria/ }).click();
  await expect(page.getByRole("article", { name: "Transcrição" })).toBeVisible();
  await page.screenshot({ path: `test-results/screens/aula-${test.info().project.name}.png`, fullPage: true });
  await page.goto("/importar");
  await page.screenshot({ path: `test-results/screens/importar-${test.info().project.name}.png`, fullPage: true });
});
