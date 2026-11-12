"use client";

import { Button, LinkButton } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/states";

/**
 * Fronteira de erro das páginas privadas. Em produção, o Next.js oculta a
 * mensagem original de erros do servidor; mostramos uma orientação genérica e
 * o identificador (digest) para localizar o registro nos logs.
 */
export default function PrivateError({ error, retry }: { error: unknown; retry: () => void }) {
  const digest = error instanceof Error && "digest" in error ? String((error as { digest?: string }).digest ?? "") : "";
  const message =
    error instanceof Error && process.env.NODE_ENV !== "production"
      ? error.message
      : "Ocorreu um erro ao carregar esta página. Verifique sua conexão e tente novamente.";

  return (
    <ErrorState
      title="Não foi possível carregar"
      description={
        <>
          {message}
          {digest ? <span className="mt-2 block text-xs text-red-700/80">Código para os logs: {digest}</span> : null}
        </>
      }
      action={
        <div className="flex flex-wrap justify-center gap-2">
          <Button onClick={() => retry()}>Tentar novamente</Button>
          <LinkButton href="/" variant="secondary">
            Ir para o início
          </LinkButton>
        </div>
      }
    />
  );
}
