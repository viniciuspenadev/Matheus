/**
 * Lista de e-mails autorizados.
 *
 * O aplicativo é pessoal: além do bloqueio no banco (tabela allowed_emails +
 * gatilho em auth.users), o servidor web recusa qualquer sessão cujo e-mail não
 * esteja em ALLOWED_EMAILS. Se a variável estiver vazia, NINGUÉM entra
 * (comportamento "fail closed").
 */

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function parseAllowedEmails(raw: string | undefined | null): Set<string> {
  if (!raw) return new Set();
  return new Set(
    raw
      .split(/[,;\s]+/)
      .map(normalizeEmail)
      .filter((e) => e.length > 0 && e.includes("@")),
  );
}

export function isEmailAllowed(email: string | null | undefined, allowed: ReadonlySet<string>): boolean {
  if (!email || allowed.size === 0) return false;
  return allowed.has(normalizeEmail(email));
}
