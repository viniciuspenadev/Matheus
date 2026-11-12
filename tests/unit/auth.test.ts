import { describe, expect, it } from "vitest";
import { isEmailAllowed, parseAllowedEmails } from "@/lib/auth/allowlist";
import { INVALID_LOGIN_MESSAGE, mapAuthError } from "@/lib/auth/errors";
import { safeNextPath } from "@/lib/auth/redirect";

describe("lista de e-mails autorizados (ALLOWED_EMAILS)", () => {
  it("normaliza, separa por vírgula/espaço/ponto e vírgula e ignora entradas inválidas", () => {
    const set = parseAllowedEmails(" Aluno@Exemplo.com, outro@ex.com;terceiro@ex.com  lixo ");
    expect([...set]).toEqual(["aluno@exemplo.com", "outro@ex.com", "terceiro@ex.com"]);
  });

  it("autoriza e-mail da lista sem diferenciar maiúsculas", () => {
    const set = parseAllowedEmails("aluno@exemplo.com");
    expect(isEmailAllowed("ALUNO@exemplo.com ", set)).toBe(true);
  });

  it("bloqueia e-mail fora da lista, vazio ou nulo", () => {
    const set = parseAllowedEmails("aluno@exemplo.com");
    expect(isEmailAllowed("intruso@exemplo.com", set)).toBe(false);
    expect(isEmailAllowed("", set)).toBe(false);
    expect(isEmailAllowed(null, set)).toBe(false);
  });

  it("falha fechada: lista vazia não autoriza ninguém", () => {
    expect(isEmailAllowed("aluno@exemplo.com", parseAllowedEmails(undefined))).toBe(false);
    expect(isEmailAllowed("aluno@exemplo.com", parseAllowedEmails(""))).toBe(false);
  });
});

describe("destino pós-login (?next=)", () => {
  it.each([
    ["/aulas/123", "/aulas/123"],
    ["/aulas?disciplina=1#t", "/aulas?disciplina=1#t"],
    [undefined, "/"],
    ["", "/"],
    ["https://malicioso.com", "/"],
    ["//malicioso.com/x", "/"],
    ["/\\malicioso.com", "/"],
    ["javascript:alert(1)", "/"],
    ["/login", "/"],
    ["/aulas\u0000", "/"],
  ])("safeNextPath(%j) → %j", (input, expected) => {
    expect(safeNextPath(input)).toBe(expected);
  });
});

describe("mensagens de erro de autenticação", () => {
  it("usa mensagem genérica para credenciais inválidas (sem enumerar contas)", () => {
    expect(mapAuthError({ code: "invalid_credentials", status: 400 })).toBe(INVALID_LOGIN_MESSAGE);
    expect(mapAuthError({ code: "user_not_found", status: 400 })).toBe(INVALID_LOGIN_MESSAGE);
  });

  it("informa limite de tentativas e falhas de conexão", () => {
    expect(mapAuthError({ code: "over_request_rate_limit", status: 429 })).toMatch(/Muitas tentativas/);
    expect(mapAuthError({ name: "AuthRetryableFetchError", message: "fetch failed" })).toMatch(/conectar/);
    expect(mapAuthError({ status: 503 })).toMatch(/conectar/);
  });
});
