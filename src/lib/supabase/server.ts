import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getPublicSupabaseEnv } from "@/lib/env";
import type { Database } from "./database.types";

/**
 * Cliente Supabase para Server Components, Server Actions e Route Handlers.
 * Usa a sessão do usuário (cookies) e a chave publicável, portanto TODAS as
 * consultas passam pelas políticas de Row Level Security.
 * Crie um novo cliente a cada requisição; nunca o compartilhe.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const { url, key } = getPublicSupabaseEnv();

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Chamado a partir de um Server Component, onde cookies são somente
          // leitura. O proxy (src/proxy.ts) já renova a sessão a cada requisição.
        }
      },
    },
  });
}

export type ServerSupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;
