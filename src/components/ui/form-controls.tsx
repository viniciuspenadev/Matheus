"use client";

import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@/lib/actions";
import { buttonClasses, type ButtonSize, type ButtonVariant } from "./button";

/** Botão de envio que se desabilita e mostra progresso enquanto a ação roda. */
export function SubmitButton({
  children,
  pendingLabel,
  variant = "primary",
  size = "md",
  className = "",
  confirmMessage,
  name,
  value,
  disabled = false,
}: {
  children: ReactNode;
  pendingLabel?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  /** Exibe uma confirmação nativa antes de enviar (ações destrutivas). */
  confirmMessage?: string;
  name?: string;
  value?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending || disabled}
      aria-disabled={pending || disabled}
      className={buttonClasses(variant, size, className)}
      onClick={(event) => {
        if (confirmMessage && !window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
    >
      {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}

/** Mensagem de resultado da ação, anunciada por leitores de tela. */
export function FormMessage({ state }: { state: ActionState }) {
  if (state.status === "idle") return <div aria-live="polite" className="sr-only" />;
  const isError = state.status === "error";
  return (
    <div
      role={isError ? "alert" : "status"}
      aria-live="polite"
      className={`rounded-xl border px-4 py-3 text-sm ${
        isError ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-900"
      }`}
    >
      {state.message}
    </div>
  );
}
