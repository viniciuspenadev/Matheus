import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
  back,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <header className="mb-6 space-y-2">
      {back ? (
        <Link
          href={back.href}
          className="no-print inline-flex min-h-9 items-center gap-1 rounded-lg text-sm font-medium text-royal-700 hover:text-royal-800"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          {back.label}
        </Link>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-navy-900 sm:text-[1.7rem]">{title}</h1>
          {description ? <div className="mt-1 text-[0.95rem] text-slate-500">{description}</div> : null}
        </div>
        {actions ? <div className="no-print flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
