import type { FieldErrors } from "@/lib/validation/common";

/** Estado retornado pelas Server Actions usadas com useActionState. */
export type ActionState =
  | { status: "idle" }
  | {
      status: "error";
      message: string;
      fieldErrors?: FieldErrors;
      /** Valores enviados, para repreencher o formulário após um erro. */
      values?: Record<string, string>;
    }
  | { status: "success"; message: string };

export const IDLE_STATE: ActionState = { status: "idle" };

export function errorState(
  message: string,
  extra: { fieldErrors?: FieldErrors; values?: Record<string, string> } = {},
): ActionState {
  return { status: "error", message, ...extra };
}

export function fieldError(state: ActionState, field: string): string | undefined {
  return state.status === "error" ? state.fieldErrors?.[field]?.[0] : undefined;
}

export function submittedValue(state: ActionState, field: string, fallback = ""): string {
  return state.status === "error" && state.values && field in state.values ? state.values[field]! : fallback;
}
