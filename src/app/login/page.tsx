import { BookOpenCheck, Lock } from "lucide-react";
import type { Metadata } from "next";
import { safeNextPath } from "@/lib/auth/redirect";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

const ERRORS: Record<string, string> = {
  "nao-autorizado": "Esta conta não está autorizada a usar o StudyFlow AI. A sessão foi encerrada.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const erro = typeof params.erro === "string" ? params.erro : undefined;
  const next = typeof params.next === "string" ? safeNextPath(params.next) : "/";

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10 pt-safe">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-navy-900 text-royal-200 shadow-sm">
            <BookOpenCheck className="size-7" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-navy-900">StudyFlow AI</h1>
          <p className="mt-1 text-sm text-slate-500">Seu assistente acadêmico pessoal</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <LoginForm next={next} initialError={erro ? ERRORS[erro] : undefined} />
        </div>

        <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-slate-500">
          <Lock className="size-3.5" aria-hidden="true" />
          Acesso privado. Não há cadastro público.
        </p>
      </div>
    </main>
  );
}
