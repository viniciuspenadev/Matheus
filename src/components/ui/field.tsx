import type { ComponentProps, ReactNode } from "react";

/*
 * Campos de formulário acessíveis. Tamanho de fonte ≥ 16px para evitar o zoom
 * automático do Safari no iPhone ao focar um campo.
 */

const control =
  "block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base text-slate-900 " +
  "placeholder:text-slate-400 shadow-sm transition-colors " +
  "focus:border-royal-500 focus:outline-none focus:ring-4 focus:ring-royal-100 " +
  "aria-[invalid=true]:border-red-400 aria-[invalid=true]:ring-red-100 disabled:bg-slate-100";

interface FieldProps {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  children: ReactNode;
}

export function Field({ id, label, hint, error, required, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-navy-900">
        {label}
        {required ? <span className="ml-0.5 text-royal-600" aria-hidden="true">*</span> : null}
      </label>
      {children}
      {hint && !error ? (
        <p id={`${id}-hint`} className="text-sm text-slate-500">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function describedBy(id: string | undefined, error?: string, hint?: boolean): string | undefined {
  if (!id) return undefined;
  if (error) return `${id}-error`;
  return hint ? `${id}-hint` : undefined;
}

interface ControlExtras {
  error?: string;
  hasHint?: boolean;
}

export function Input({ error, hasHint, className = "", id, ...props }: ComponentProps<"input"> & ControlExtras) {
  return (
    <input
      id={id}
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy(id, error, hasHint)}
      className={`${control} ${className}`}
      {...props}
    />
  );
}

export function Textarea({ error, hasHint, className = "", id, ...props }: ComponentProps<"textarea"> & ControlExtras) {
  return (
    <textarea
      id={id}
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy(id, error, hasHint)}
      className={`${control} ${className}`}
      {...props}
    />
  );
}

export function Select({ error, hasHint, className = "", id, ...props }: ComponentProps<"select"> & ControlExtras) {
  return (
    <select
      id={id}
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy(id, error, hasHint)}
      className={`${control} appearance-auto ${className}`}
      {...props}
    />
  );
}
