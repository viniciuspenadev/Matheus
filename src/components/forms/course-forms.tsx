"use client";

import { Check, Pencil, X } from "lucide-react";
import { useActionState, useState } from "react";
import { Field, Input } from "@/components/ui/field";
import { FormMessage, SubmitButton } from "@/components/ui/form-controls";
import { IDLE_STATE, fieldError, submittedValue, type ActionState } from "@/lib/actions";

type FormAction = (prev: ActionState, formData: FormData) => Promise<ActionState>;

export function CreateCourseForm({ action }: { action: FormAction }) {
  const [state, formAction] = useActionState(action, IDLE_STATE);
  const formKey = state.status === "error" ? JSON.stringify(state.values ?? {}) : `ok-${state.status === "success" ? state.message : ""}`;
  return (
    <form action={formAction} className="space-y-4" key={formKey} noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="course-name" label="Nome do curso" required error={fieldError(state, "name")}>
          <Input id="course-name" name="name" required maxLength={160} defaultValue={submittedValue(state, "name")} error={fieldError(state, "name")} placeholder="Ex.: Biotecnologia" />
        </Field>
        <Field id="course-institution" label="Instituição" error={fieldError(state, "institution")}>
          <Input id="course-institution" name="institution" maxLength={160} defaultValue={submittedValue(state, "institution")} error={fieldError(state, "institution")} />
        </Field>
      </div>
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Criando...">Adicionar curso</SubmitButton>
    </form>
  );
}

export function EditCourseRow({
  course,
  updateAction,
  deleteAction,
}: {
  course: { id: string; name: string; institution: string | null; subjectCount: number };
  updateAction: FormAction;
  deleteAction: (prev: ActionState) => Promise<ActionState>;
}) {
  const [editing, setEditing] = useState(false);
  const [updateState, updateFormAction] = useActionState(async (prev: ActionState, fd: FormData) => {
    const result = await updateAction(prev, fd);
    if (result.status === "success") setEditing(false);
    return result;
  }, IDLE_STATE);
  const [deleteState, deleteFormAction] = useActionState(deleteAction, IDLE_STATE);
  const state = deleteState.status !== "idle" ? deleteState : updateState;

  return (
    <li className="py-4">
      {editing ? (
        <form action={updateFormAction} className="space-y-3" noValidate>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id={`name-${course.id}`} label="Nome" required error={fieldError(updateState, "name")}>
              <Input id={`name-${course.id}`} name="name" required maxLength={160} defaultValue={submittedValue(updateState, "name", course.name)} />
            </Field>
            <Field id={`inst-${course.id}`} label="Instituição" error={fieldError(updateState, "institution")}>
              <Input id={`inst-${course.id}`} name="institution" maxLength={160} defaultValue={submittedValue(updateState, "institution", course.institution ?? "")} />
            </Field>
          </div>
          <div className="flex gap-2">
            <SubmitButton size="sm" pendingLabel="Salvando...">
              <Check className="size-4" aria-hidden="true" /> Salvar
            </SubmitButton>
            <button type="button" onClick={() => setEditing(false)} className="inline-flex min-h-9 items-center gap-1 rounded-xl px-3 text-sm font-medium text-slate-600 hover:bg-slate-100">
              <X className="size-4" aria-hidden="true" /> Cancelar
            </button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium text-navy-900">{course.name}</p>
            <p className="text-sm text-slate-500">
              {course.institution ? `${course.institution} · ` : ""}
              {course.subjectCount === 1 ? "1 disciplina" : `${course.subjectCount} disciplinas`}
            </p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setEditing(true)} className="inline-flex min-h-9 items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-navy-900 hover:bg-royal-50">
              <Pencil className="size-4" aria-hidden="true" /> Editar
            </button>
            <form action={deleteFormAction}>
              <SubmitButton
                variant="danger"
                size="sm"
                pendingLabel="Excluindo..."
                confirmMessage={`Excluir o curso “${course.name}”? As disciplinas vinculadas serão mantidas, sem curso.`}
              >
                Excluir
              </SubmitButton>
            </form>
          </div>
        </div>
      )}
      {state.status !== "idle" ? (
        <div className="mt-3">
          <FormMessage state={state} />
        </div>
      ) : null}
    </li>
  );
}
