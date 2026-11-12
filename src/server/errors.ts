import "server-only";

/** Erro cuja mensagem pode ser exibida ao usuário com segurança. */
export class UserFacingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserFacingError";
  }
}

interface DbErrorLike {
  code?: string;
  message: string;
  details?: string | null;
  hint?: string | null;
}

/** Códigos levantados pelas nossas funções SQL, cujas mensagens já estão em português. */
const OWN_RPC_CODES = new Set(["P0002", "22023", "22001", "55000", "23505", "28000", "42501"]);

const CONNECTION_MESSAGE =
  "Não foi possível conectar ao banco de dados. Verifique a internet e a configuração do Supabase.";

/**
 * Converte um erro do PostgREST em mensagem amigável.
 * @param overrides mensagens específicas por código SQLSTATE (ex.: 23505 → nome duplicado)
 * @param trustRpcMessage use true para RPCs próprias, cujas mensagens são em português
 */
export function describeDbError(
  error: DbErrorLike,
  overrides: Partial<Record<string, string>> = {},
  trustRpcMessage = false,
): string {
  const code = error.code ?? "";
  if (overrides[code]) return overrides[code]!;
  if (trustRpcMessage && OWN_RPC_CODES.has(code)) return error.message;
  if (!code && /fetch failed|network|ECONNREFUSED|ENOTFOUND|timeout/i.test(error.message)) {
    return CONNECTION_MESSAGE;
  }
  switch (code) {
    case "42501":
      return "Você não tem permissão para realizar esta operação.";
    case "23505":
      return "Já existe um registro com esses dados.";
    case "23503":
      return "Este registro está vinculado a outros dados e não pode ser alterado assim.";
    case "23514":
    case "22001":
      return "Algum campo excede o tamanho ou formato permitido.";
    case "PGRST116":
      return "Registro não encontrado.";
    case "PGRST301":
    case "PGRST302":
      return "Sua sessão expirou. Entre novamente.";
    default:
      return "Não foi possível concluir a operação. Tente novamente.";
  }
}

/** Lança UserFacingError a partir de um erro do Supabase. */
export function throwDbError(
  error: DbErrorLike,
  overrides?: Partial<Record<string, string>>,
  trustRpcMessage?: boolean,
): never {
  // Registra apenas metadados técnicos — nunca conteúdo de transcrições.
  console.error("[db]", { code: error.code, message: error.message.slice(0, 300) });
  throw new UserFacingError(describeDbError(error, overrides, trustRpcMessage));
}
