"use client";

import { Trash2 } from "lucide-react";
import { useActionState } from "react";
import { FormMessage, SubmitButton } from "@/components/ui/form-controls";
import { IDLE_STATE, type ActionState } from "@/lib/actions";

/** Botão de exclusão com confirmação e exibição do erro retornado pela ação. */
export function DeleteForm({
  action,
  label,
  confirmMessage,
  size = "md",
}: {
  action: (prev: ActionState) => Promise<ActionState>;
  label: string;
  confirmMessage: string;
  size?: "sm" | "md";
}) {
  const [state, formAction] = useActionState(action, IDLE_STATE);
  return (
    <form action={formAction} className="space-y-3">
      <SubmitButton variant="danger" size={size} confirmMessage={confirmMessage} pendingLabel="Excluindo...">
        <Trash2 className="size-4" aria-hidden="true" />
        {label}
      </SubmitButton>
      {state.status !== "idle" ? <FormMessage state={state} /> : null}
    </form>
  );
}
