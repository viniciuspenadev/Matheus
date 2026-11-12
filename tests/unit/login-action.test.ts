/**
 * Server Action de login (testes obrigatórios 1 e 2, camada web).
 * O cliente do Supabase é simulado; a validação, a allowlist e o
 * redirecionamento são os reais.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IDLE_STATE } from "@/lib/actions";
import { INVALID_LOGIN_MESSAGE } from "@/lib/auth/errors";

const signInWithPassword = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({ auth: { signInWithPassword, signOut: vi.fn() } })),
}));

const { signIn } = await import("@/app/login/actions");

function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

/** redirect() do Next.js lança um erro especial; extraímos o destino dele. */
async function redirectTarget(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (err) {
    const digest = String((err as { digest?: string }).digest ?? "");
    if (digest.startsWith("NEXT_REDIRECT")) return digest.split(";")[2]!;
    throw err;
  }
  throw new Error("Esperava um redirecionamento.");
}

beforeEach(() => {
  vi.stubEnv("ALLOWED_EMAILS", "aluno@exemplo.com");
  signInWithPassword.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("login", () => {
  it("login autorizado: autentica e redireciona ao destino seguro", async () => {
    signInWithPassword.mockResolvedValue({ data: {}, error: null });
    const target = await redirectTarget(
      signIn(IDLE_STATE, form({ email: "Aluno@Exemplo.com", password: "segredo", next: "/aulas" })),
    );
    expect(target).toBe("/aulas");
    expect(signInWithPassword).toHaveBeenCalledWith({ email: "aluno@exemplo.com", password: "segredo" });
  });

  it("ignora destino externo malicioso", async () => {
    signInWithPassword.mockResolvedValue({ data: {}, error: null });
    const target = await redirectTarget(
      signIn(IDLE_STATE, form({ email: "aluno@exemplo.com", password: "x", next: "https://evil.example" })),
    );
    expect(target).toBe("/");
  });

  it("bloqueia e-mail não autorizado sem consultar o Supabase", async () => {
    const state = await signIn(IDLE_STATE, form({ email: "intruso@exemplo.com", password: "x" }));
    expect(state).toMatchObject({ status: "error", message: INVALID_LOGIN_MESSAGE });
    expect(signInWithPassword).not.toHaveBeenCalled();
  });

  it("senha incorreta retorna mensagem genérica", async () => {
    signInWithPassword.mockResolvedValue({ data: {}, error: { code: "invalid_credentials", status: 400 } });
    const state = await signIn(IDLE_STATE, form({ email: "aluno@exemplo.com", password: "errada" }));
    expect(state).toMatchObject({ status: "error", message: INVALID_LOGIN_MESSAGE, values: { email: "aluno@exemplo.com" } });
  });

  it("sem ALLOWED_EMAILS, ninguém entra", async () => {
    vi.stubEnv("ALLOWED_EMAILS", "");
    const state = await signIn(IDLE_STATE, form({ email: "aluno@exemplo.com", password: "x" }));
    expect(state.status).toBe("error");
    expect(signInWithPassword).not.toHaveBeenCalled();
  });

  it("valida o formulário", async () => {
    const state = await signIn(IDLE_STATE, form({ email: "nao-e-email", password: "" }));
    expect(state.status).toBe("error");
    expect(signInWithPassword).not.toHaveBeenCalled();
  });
});
