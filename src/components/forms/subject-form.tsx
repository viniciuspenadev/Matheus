"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { FormMessage, SubmitButton } from "@/components/ui/form-controls";
import { IDLE_STATE, fieldError, submittedValue, type ActionState } from "@/lib/actions";

export interface SubjectFormDefaults {
  name: string;
  code: string;
  professor: string;
  description: string;
  courseId: string;
  keywords: string;
}

const EMPTY: SubjectFormDefaults = { name: "", code: "", professor: "", description: "", courseId: "", keywords: "" };

export function SubjectForm({
  action,
  courses,
  defaults = EMPTY,
  submitLabel,
  cancelHref,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  courses: { id: string; name: string }[];
  defaults?: SubjectFormDefaults;
  submitLabel: string;
  cancelHref: string;
}) {
  const [state, formAction] = useActionState(action, IDLE_STATE);
  const v = (field: keyof SubjectFormDefaults) => submittedValue(state, field, defaults[field]);
  // Remonta os campos após um erro para aplicar os valores enviados.
  const formKey = state.status === "error" ? JSON.stringify(state.values ?? {}) : "initial";

  return (
    <form action={formAction} className="space-y-5" key={formKey} noValidate>
      <Field id="name" label="Nome da disciplina" required error={fieldError(state, "name")}>
        <Input id="name" name="name" required maxLength={160} defaultValue={v("name")} error={fieldError(state, "name")} placeholder="Ex.: Bioquímica I" />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="code" label="Código" error={fieldError(state, "code")}>
          <Input id="code" name="code" maxLength={40} defaultValue={v("code")} error={fieldError(state, "code")} placeholder="Ex.: BQ101" />
        </Field>
        <Field id="professor" label="Professor(a)" error={fieldError(state, "professor")}>
          <Input id="professor" name="professor" maxLength={160} defaultValue={v("professor")} error={fieldError(state, "professor")} />
        </Field>
      </div>

      <Field
        id="courseId"
        label="Curso"
        error={fieldError(state, "courseId")}
        hint={
          <>
            Opcional.{" "}
            <Link href="/disciplinas/cursos" className="font-medium text-royal-700 underline-offset-2 hover:underline">
              Gerenciar cursos
            </Link>
          </>
        }
      >
        <Select id="courseId" name="courseId" defaultValue={v("courseId")} error={fieldError(state, "courseId")} hasHint>
          <option value="">Sem curso</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        id="keywords"
        label="Vocabulário científico"
        error={fieldError(state, "keywords")}
        hint="Termos separados por vírgula ou linha (ex.: glicólise, gliconeogênese, estequiometria). Servem de contexto para a transcrição — nunca são inseridos à força no texto."
      >
        <Textarea
          id="keywords"
          name="keywords"
          rows={3}
          defaultValue={v("keywords")}
          error={fieldError(state, "keywords")}
          hasHint
          placeholder="enzimas, glicólise, mol, DNA, RNA"
        />
      </Field>

      <Field id="description" label="Descrição" error={fieldError(state, "description")}>
        <Textarea id="description" name="description" rows={3} maxLength={2000} defaultValue={v("description")} error={fieldError(state, "description")} />
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
