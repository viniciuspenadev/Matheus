import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";
import { isEmailAllowed } from "@/lib/auth/allowlist";
import { getAllowedEmails } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface SessionUser {
  id: string;
  email: string;
}

/**
 * Lê o usuário da sessão atual (validando o JWT). Memorizado por requisição.
 * Retorna null quando não há sessão válida.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) return null;
  return { id: claims.sub, email: typeof claims.email === "string" ? claims.email : "" };
});

/**
 * Exige um usuário autenticado e autorizado. Use em TODA página privada,
 * Server Action e Route Handler — o proxy sozinho não é uma barreira de
 * segurança suficiente.
 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!isEmailAllowed(user.email, getAllowedEmails())) {
    redirect("/login?erro=nao-autorizado");
  }
  return user;
}
