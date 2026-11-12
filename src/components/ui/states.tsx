import { AlertTriangle, Inbox } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
      <div className="mb-3 rounded-full bg-royal-50 p-3 text-royal-600" aria-hidden="true">
        {icon ?? <Inbox className="size-6" />}
      </div>
      <p className="text-base font-semibold text-navy-900">{title}</p>
      {description ? <p className="mt-1 max-w-md text-sm text-slate-500">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ title, description, action }: { title: string; description?: ReactNode; action?: ReactNode }) {
  return (
    <div role="alert" className="flex flex-col items-center rounded-2xl border border-red-200 bg-red-50/60 px-6 py-10 text-center">
      <div className="mb-3 rounded-full bg-red-100 p-3 text-red-700" aria-hidden="true">
        <AlertTriangle className="size-6" />
      </div>
      <p className="text-base font-semibold text-red-900">{title}</p>
      {description ? <p className="mt-1 max-w-md text-sm text-red-800">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200/70 ${className}`} aria-hidden="true" />;
}

export function Notice({
  tone = "info",
  children,
}: {
  tone?: "info" | "warning" | "success" | "danger";
  children: ReactNode;
}) {
  const styles = {
    info: "border-royal-200 bg-royal-50 text-navy-800",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
    danger: "border-red-200 bg-red-50 text-red-800",
  } as const;
  return <div className={`rounded-xl border px-4 py-3 text-sm ${styles[tone]}`}>{children}</div>;
}
