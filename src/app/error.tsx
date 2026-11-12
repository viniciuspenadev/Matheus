"use client";

/**
 * Fronteira de erro raiz. Captura, por exemplo, falhas de configuração
 * (variáveis do Supabase ausentes) lançadas pelo layout privado.
 */
export default function RootError({ error, retry }: { error: unknown; retry: () => void }) {
  const showDetails = process.env.NODE_ENV !== "production" && error instanceof Error;
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div role="alert" className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-red-900">Algo deu errado</h1>
        <p className="mt-2 text-sm text-slate-600">
          {showDetails
            ? (error as Error).message
            : "Não foi possível carregar o StudyFlow AI. Se o problema persistir, verifique as variáveis de ambiente do servidor e os logs."}
        </p>
        <button
          type="button"
          onClick={() => retry()}
          className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-royal-600 px-4 text-sm font-medium text-white hover:bg-royal-700"
        >
          Tentar novamente
        </button>
      </div>
    </main>
  );
}
