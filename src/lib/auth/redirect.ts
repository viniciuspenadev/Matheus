/**
 * Valida o destino pós-login recebido em ?next=... para evitar redirecionamento
 * aberto (open redirect). Só aceita caminhos internos absolutos.
 */
export function safeNextPath(raw: string | null | undefined, fallback = "/"): string {
  if (!raw || typeof raw !== "string") return fallback;
  const value = raw.trim();
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f\u007f]/.test(value)) return fallback;
  try {
    // Uma base fictícia garante que o resultado continue no mesmo host.
    const url = new URL(value, "http://studyflow.local");
    if (url.host !== "studyflow.local") return fallback;
    if (url.pathname === "/login") return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
