/**
 * Converte erros do Supabase Auth em mensagens claras em português, sem revelar
 * se um e-mail existe (evita enumeração de contas).
 */
export const INVALID_LOGIN_MESSAGE = "E-mail ou senha incorretos, ou acesso não autorizado.";

interface AuthLikeError {
  name?: string;
  message?: string;
  status?: number;
  code?: string;
}

export function mapAuthError(error: AuthLikeError | null | undefined): string {
  if (!error) return INVALID_LOGIN_MESSAGE;
  const code = error.code ?? "";
  const status = error.status ?? 0;

  if (code === "over_request_rate_limit" || code === "over_email_send_rate_limit" || status === 429) {
    return "Muitas tentativas de login. Aguarde alguns minutos e tente novamente.";
  }
  if (code === "email_not_confirmed") {
    return "Este e-mail ainda não foi confirmado. Confirme a conta no painel do Supabase.";
  }
  if (code === "user_banned") {
    return "Esta conta está bloqueada.";
  }
  if (
    error.name === "AuthRetryableFetchError" ||
    status >= 500 ||
    /fetch failed|network|ECONNREFUSED|ENOTFOUND/i.test(error.message ?? "")
  ) {
    return "Não foi possível conectar ao serviço de autenticação. Verifique a internet e a configuração do Supabase.";
  }
  return INVALID_LOGIN_MESSAGE;
}
