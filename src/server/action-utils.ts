import "server-only";

import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { ConfigError } from "@/lib/env";
import { TranscriptTextError } from "@/lib/text/transcript";
import { UserFacingError } from "./errors";

/**
 * Mensagem segura para exibir ao usuário a partir de qualquer erro.
 * Erros internos do Next.js (redirect/notFound, inclusive os disparados por
 * requireUser) são relançados para manter o fluxo esperado.
 */
export function userMessageOf(err: unknown): string {
  unstable_rethrow(err);
  if (err instanceof UserFacingError || err instanceof ConfigError || err instanceof TranscriptTextError) {
    return err.message;
  }
  console.error("[action] erro inesperado", err instanceof Error ? `${err.name}: ${err.message}` : err);
  return "Ocorreu um erro inesperado. Tente novamente.";
}

const uuid = z.uuid();

export function isUuid(value: unknown): value is string {
  return uuid.safeParse(value).success;
}
