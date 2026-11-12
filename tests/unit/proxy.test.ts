/**
 * Proteção de rotas no proxy (testes obrigatórios 1 e 2, camada web).
 * O cliente do Supabase é simulado; o restante (NextRequest/NextResponse,
 * allowlist e redirecionamentos) é o código real.
 */
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const auth = {
  getClaims: vi.fn(),
  signOut: vi.fn(),
};

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({ auth })),
}));

const { updateSession } = await import("@/lib/supabase/proxy");

function request(path: string) {
  return new NextRequest(new URL(path, "http://localhost:3000"));
}

function claimsFor(email: string | null) {
  return { data: email === null ? { claims: null } : { claims: { sub: "u1", email } }, error: null };
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://supabase.local");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test_key_123456");
  vi.stubEnv("ALLOWED_EMAILS", "aluno@exemplo.com");
  auth.getClaims.mockReset();
  auth.signOut.mockReset().mockResolvedValue({ error: null });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("proxy de autenticação", () => {
  it("redireciona visitante sem sessão para /login preservando o destino", async () => {
    auth.getClaims.mockResolvedValue(claimsFor(null));
    const res = await updateSession(request("/aulas/abc?x=1"));
    expect(res.status).toBe(307);
    const location = new URL(res.headers.get("location")!);
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("next")).toBe("/aulas/abc?x=1");
  });

  it("permite a página de login sem sessão", async () => {
    auth.getClaims.mockResolvedValue(claimsFor(null));
    const res = await updateSession(request("/login"));
    expect(res.headers.get("location")).toBeNull();
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });

  it("libera usuário autorizado nas rotas privadas", async () => {
    auth.getClaims.mockResolvedValue(claimsFor("Aluno@Exemplo.com"));
    const res = await updateSession(request("/disciplinas"));
    expect(res.headers.get("location")).toBeNull();
    expect(auth.signOut).not.toHaveBeenCalled();
  });

  it("leva usuário autorizado que abre /login para o painel", async () => {
    auth.getClaims.mockResolvedValue(claimsFor("aluno@exemplo.com"));
    const res = await updateSession(request("/login"));
    expect(new URL(res.headers.get("location")!).pathname).toBe("/");
  });

  it("encerra a sessão de e-mail não autorizado e mostra o aviso", async () => {
    auth.getClaims.mockResolvedValue(claimsFor("intruso@exemplo.com"));
    const res = await updateSession(request("/aulas"));
    expect(auth.signOut).toHaveBeenCalledTimes(1);
    const location = new URL(res.headers.get("location")!);
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("erro")).toBe("nao-autorizado");
  });

  it("falha fechada quando ALLOWED_EMAILS está vazio", async () => {
    vi.stubEnv("ALLOWED_EMAILS", "");
    auth.getClaims.mockResolvedValue(claimsFor("aluno@exemplo.com"));
    const res = await updateSession(request("/"));
    expect(auth.signOut).toHaveBeenCalled();
    expect(new URL(res.headers.get("location")!).searchParams.get("erro")).toBe("nao-autorizado");
  });

  it("sem configuração do Supabase, deixa a página exibir o erro de configuração", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    const res = await updateSession(request("/"));
    expect(res.headers.get("x-middleware-next")).toBe("1");
    expect(auth.getClaims).not.toHaveBeenCalled();
  });
});
