import { BookOpenCheck, LogOut } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { signOut } from "@/app/login/actions";
import { BottomNav, SideNav } from "./nav-links";

export function AppShell({ email, children }: { email: string; children: ReactNode }) {
  return (
    <div className="min-h-dvh md:flex">
      {/* Barra lateral (tablet/desktop) */}
      <aside className="no-print sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        <Link href="/" className="flex items-center gap-2.5 px-5 py-5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-navy-900 text-royal-200">
            <BookOpenCheck className="size-5" aria-hidden="true" />
          </span>
          <span className="text-[1.05rem] font-semibold tracking-tight text-navy-900">StudyFlow AI</span>
        </Link>
        <SideNav />
        <div className="mt-auto border-t border-slate-200 p-4">
          <p className="truncate text-xs text-slate-500" title={email}>
            {email}
          </p>
          <form action={signOut} className="mt-2">
            <button
              type="submit"
              className="inline-flex min-h-9 items-center gap-2 rounded-lg px-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-navy-900"
            >
              <LogOut className="size-4" aria-hidden="true" />
              Sair
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Cabeçalho (celular) */}
        <header className="no-print sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 pt-safe backdrop-blur md:hidden">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-navy-900 text-royal-200">
              <BookOpenCheck className="size-4.5" aria-hidden="true" />
            </span>
            <span className="font-semibold tracking-tight text-navy-900">StudyFlow AI</span>
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              aria-label="Sair"
              className="inline-flex size-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
            >
              <LogOut className="size-5" aria-hidden="true" />
            </button>
          </form>
        </header>

        <main id="conteudo" className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-6 sm:px-6 md:pb-12 md:pt-10">
          {children}
        </main>

        <BottomNav />
      </div>
    </div>
  );
}
