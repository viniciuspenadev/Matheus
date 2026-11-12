"use server";

import { redirect } from "next/navigation";
import { errorState, type ActionState } from "@/lib/actions";
import { isEmailAllowed } from "@/lib/auth/allowlist";
import { INVALID_LOGIN_MESSAGE, mapAuthError } from "@/lib/auth/errors";
import { safeNextPath } from "@/lib/auth/redirect";
import { ConfigError, getAllowedEmails } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formDataToRecord } from "@/lib/validation/common";
import { loginSchema } from "@/lib/validation/schemas";

export async function signIn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const raw = formDataToRecord(formData);
  const values = { email: raw.email ?? "" };
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return errorState("Informe um e-mail válido e a senha.", { values });
  }

  const allowed = getAllowedEmails();
  if (allowed.size === 0) {
    return errorState("Acesso não configurado: defina ALLOWED_EMAILS nas variáveis de ambiente do servidor.", {
      values,
    });
  }
  // E-mails fora da lista recebem a mesma mensagem genérica de credenciais
  // inválidas, sem consultar o Supabase.
  if (!isEmailAllowed(parsed.data.email, allowed)) {
    return errorState(INVALID_LOGIN_MESSAGE, { values });
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });
    if (error) {
      console.warn("[auth] falha de login", { code: error.code, status: error.status });
      return errorState(mapAuthError(error), { values });
    }
  } catch (err) {
    if (err instanceof ConfigError) return errorState(err.message, { values });
    console.error("[auth] erro inesperado no login", err instanceof Error ? err.message : err);
    return errorState(mapAuthError({ name: "AuthRetryableFetchError" }), { values });
  }

  redirect(safeNextPath(parsed.data.next));
}

export async function signOut(): Promise<void> {
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  } catch (err) {
    console.error("[auth] erro ao sair", err instanceof Error ? err.message : err);
  }
  redirect("/login");
}
