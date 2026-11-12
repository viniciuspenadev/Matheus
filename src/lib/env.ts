/**
 * Leitura centralizada das variáveis de ambiente do aplicativo web.
 *
 * As variáveis NEXT_PUBLIC_* precisam ser lidas literalmente (process.env.NOME)
 * para que o Next.js consiga incorporá-las ao bundle do navegador.
 */
import { parseAllowedEmails } from "@/lib/auth/allowlist";

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

export interface PublicSupabaseEnv {
  url: string;
  /** Chave publicável (sb_publishable_...) ou chave anon legada. Nunca a chave secreta. */
  key: string;
}

export function getPublicSupabaseEnv(): PublicSupabaseEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )?.trim();

  const missing: string[] = [];
  if (!url) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!key) missing.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  if (missing.length > 0 || !url || !key) {
    throw new ConfigError(
      `Configuração ausente: defina ${missing.join(" e ")} no arquivo .env.local (veja .env.example).`,
    );
  }

  try {
    new URL(url);
  } catch {
    throw new ConfigError("NEXT_PUBLIC_SUPABASE_URL não é uma URL válida.");
  }

  if (key.startsWith("sb_secret_")) {
    throw new ConfigError(
      "A chave secreta do Supabase não pode ser usada no navegador. Use a chave publicável (sb_publishable_...).",
    );
  }

  return { url, key };
}

/** E-mails autorizados a entrar no aplicativo (variável ALLOWED_EMAILS, somente servidor). */
export function getAllowedEmails(): Set<string> {
  return parseAllowedEmails(process.env.ALLOWED_EMAILS);
}

/** Fuso horário usado para exibir datas (padrão: horário de Brasília). */
export function getAppTimeZone(): string {
  return process.env.APP_TIMEZONE?.trim() || "America/Sao_Paulo";
}
