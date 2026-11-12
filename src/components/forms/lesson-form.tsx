"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { FormMessage, SubmitButton } from "@/components/ui/form-controls";
import { IDLE_STATE, fieldError, submittedValue, type ActionState } from "@/lib/actions";

export interface LessonFormDefaults {
  subjectId: string;
  title: string;
  lessonDate: string;
  notes: string;
}

export function LessonForm({
  action,
  subjects,
  defaults,
  submitLabel,
  cancelHref,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  subjects: { id: string; name: string }[];
  defaults: LessonFormDefaults;
  submitLabel: string;
  cancelHref: string;
}) {
  const [state, formAction] = useActionState(action, IDLE_STATE);
  const v = (field: keyof LessonFormDefaults) => submittedValue(state, field, defaults[field]);
  const formKey = state.status === "error" ? JSON.stringify(state.values ?? {}) : "initial";

  return (
    <form action={formAction} className="space-y-5" key={formKey} noValidate>
      <Field id="subjectId" label="Disciplina" required error={fieldError(state, "subjectId")}>
        <Select id="subjectId" name="subjectId" required defaultValue={v("subjectId")} error={fieldError(state, "subjectId")}>
          <option value="" disabled>
            Selecione...
          </option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field id="title" label="Título da aula" required error={fieldError(state, "title")}>
        <Input id="title" name="title" required maxLength={200} defaultValue={v("title")} error={fieldError(state, "title")} placeholder="Ex.: Aula 5 — Glicólise e regulação" />
      </Field>

      <Field id="lessonDate" label="Data da aula" error={fieldError(state, "lessonDate")}>
        <Input id="lessonDate" name="lessonDate" type="date" defaultValue={v("lessonDate")} error={fieldError(state, "lessonDate")} className="sm:max-w-xs" />
      </Field>

      <Field id="notes" label="Observações" error={fieldError(state, "notes")}>
        <Textarea id="notes" name="notes" rows={3} maxLength={4000} defaultValue={v("notes")} error={fieldError(state, "notes")} />
      </Field>

      <FormMessage state={state} />

      <div className="flex flex-wrap gap-2">
        <SubmitButton pendingLabel="Salvando...">{submitLabel}</SubmitButton>
        <Link href={cancelHref} className="inline-flex min-h-11 items-center rounded-xl px-4 text-[0.95rem] font-medium text-slate-600 hover:bg-slate-100">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
