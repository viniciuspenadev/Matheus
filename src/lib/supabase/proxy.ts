import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isEmailAllowed } from "@/lib/auth/allowlist";
import { ConfigError, getAllowedEmails, getPublicSupabaseEnv } from "@/lib/env";
import type { Database } from "./database.types";

/** Rotas acessíveis sem sessão. */
const PUBLIC_PATHS = new Set(["/login"]);

function redirectKeepingCookies(url: URL, source: NextResponse): NextResponse {
  const redirect = NextResponse.redirect(url);
  for (const cookie of source.cookies.getAll()) {
    redirect.cookies.set(cookie);
  }
  const cacheControl = source.headers.get("cache-control");
  if (cacheControl) redirect.headers.set("cache-control", cacheControl);
  return redirect;
}

/**
 * Executado pelo proxy do Next.js antes de cada rota:
 * 1. renova a sessão do Supabase e grava os cookies atualizados;
 * 2. redireciona visitantes sem sessão para /login;
 * 3. encerra sessões de e-mails fora de ALLOWED_EMAILS.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  let env;
  try {
    env = getPublicSupabaseEnv();
  } catch (err) {
    if (err instanceof ConfigError) {
      // Sem configuração, deixamos a página renderizar o erro explicativo.
      return response;
    }
    throw err;
  }

  const supabase = createServerClient<Database>(env.url, env.key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        for (const [key, value] of Object.entries(headers ?? {})) {
          response.headers.set(key, value);
        }
      },
    },
  });

  // Não insira código entre a criação do cliente e getClaims(): a renovação
  // da sessão acontece aqui.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  const { pathname, search } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.has(pathname);

  if (!claims) {
    if (isPublic) return response;
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    if (pathname !== "/") url.searchParams.set("next", `${pathname}${search}`);
    return redirectKeepingCookies(url, response);
  }

  const email = typeof claims.email === "string" ? claims.email : null;
  if (!isEmailAllowed(email, getAllowedEmails())) {
    await supabase.auth.signOut();
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "?erro=nao-autorizado";
    if (pathname === "/login" && request.nextUrl.searchParams.get("erro") === "nao-autorizado") {
      return response;
    }
    return redirectKeepingCookies(url, response);
  }

  if (isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return redirectKeepingCookies(url, response);
  }

  return response;
}
