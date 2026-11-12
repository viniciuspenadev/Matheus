"use client";

import { ClipboardPaste, FileText } from "lucide-react";
import { useActionState, useDeferredValue, useRef, useState } from "react";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { FormMessage, SubmitButton } from "@/components/ui/form-controls";
import { IDLE_STATE, fieldError, submittedValue, type ActionState } from "@/lib/actions";
import { formatBytes, formatNumber } from "@/lib/format";
import { MAX_TRANSCRIPT_CHARS, MAX_TXT_BYTES, countWords } from "@/lib/text/transcript";

type Mode = "file" | "paste";

type Variant =
  | { kind: "new"; subjects: { id: string; name: string }[]; defaultSubjectId?: string }
  | { kind: "existing"; lessonId: string };

export function TranscriptImportForm({
  action,
  variant,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  variant: Variant;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [state, formAction] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await action(prev, formData);
    // O campo de arquivo é limpo após o envio; o usuário precisa selecioná-lo de novo.
    if (result.status === "error") setFile(null);
    return result;
  }, IDLE_STATE);
  const [mode, setMode] = useState<Mode>("file");
  const [text, setText] = useState("");
  const deferredText = useDeferredValue(text);
  const titleRef = useRef<HTMLInputElement>(null);

  const fileProblem =
    file && !file.name.toLowerCase().endsWith(".txt")
      ? "Selecione um arquivo com extensão .txt."
      : file && file.size > MAX_TXT_BYTES
        ? `O arquivo tem ${formatBytes(file.size)}; o limite é 4 MB.`
        : null;
  const charCount = deferredText.trim().length;
  // Só mede os bytes UTF-8 de textos grandes (evita custo a cada tecla).
  const tooManyBytes = charCount > 1_000_000 && new TextEncoder().encode(deferredText).length > MAX_TXT_BYTES;
  const textProblem =
    charCount > MAX_TRANSCRIPT_CHARS
      ? "O texto excede o limite de 3.000.000 de caracteres."
      : tooManyBytes
        ? "O texto colado excede 4 MB. Envie-o como arquivo .txt dividido ou reduza o conteúdo."
        : null;
  const blocked = mode === "file" ? !file || Boolean(fileProblem) : charCount === 0 || Boolean(textProblem);

  const formKey = state.status === "error" ? `err-${JSON.stringify({ ...state.values, text: undefined })}` : "initial";

  return (
    <form action={formAction} className="space-y-5" key={formKey} noValidate>
      <input type="hidden" name="mode" value={mode} />
      {variant.kind === "existing" ? <input type="hidden" name="lessonId" value={variant.lessonId} /> : null}

      {variant.kind === "new" ? (
        <>
          <Field id="subjectId" label="Disciplina" required error={fieldError(state, "subjectId")}>
            <Select
              id="subjectId"
              name="subjectId"
              required
              defaultValue={submittedValue(state, "subjectId", variant.defaultSubjectId ?? "")}
              error={fieldError(state, "subjectId")}
            >
              <option value="" disabled>
                Selecione...
              </option>
              {variant.subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid gap-5 sm:grid-cols-[1fr_auto]">
            <Field id="title" label="Título da aula" required error={fieldError(state, "title")}>
              <Input
                ref={titleRef}
                id="title"
                name="title"
                required
                maxLength={200}
                defaultValue={submittedValue(state, "title")}
                error={fieldError(state, "title")}
                placeholder="Ex.: Aula 3 — Estequiometria"
              />
            </Field>
            <Field id="lessonDate" label="Data da aula" error={fieldError(state, "lessonDate")}>
              <Input id="lessonDate" name="lessonDate" type="date" defaultValue={submittedValue(state, "lessonDate")} error={fieldError(state, "lessonDate")} />
            </Field>
          </div>
        </>
      ) : null}

      <fieldset>
        <legend className="mb-2 block text-sm font-medium text-navy-900">Como deseja enviar a transcrição?</legend>
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1" role="radiogroup">
          {(
            [
              { value: "file", label: "Arquivo .txt", icon: FileText },
              { value: "paste", label: "Colar texto", icon: ClipboardPaste },
            ] as const
          ).map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={mode === value}
              onClick={() => setMode(value)}
              className={`flex min-h-11 items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors ${
                mode === value ? "bg-white text-royal-700 shadow-sm" : "text-slate-600 hover:text-navy-900"
              }`}
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      {mode === "file" ? (
        <Field
          id="file"
          label="Arquivo de transcrição"
          required
          error={fileProblem ?? undefined}
          hint="Arquivo .txt de até 4 MB. Codificações UTF-8, UTF-16 e Windows-1252 são detectadas automaticamente."
        >
          {/* Input nativo visualmente oculto (mas focável) + botão em português. */}
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white p-3">
            <input
              id="file"
              name="file"
              type="file"
              accept=".txt,text/plain"
              required
              aria-invalid={fileProblem ? true : undefined}
              aria-describedby={fileProblem ? "file-error" : "file-hint"}
              className="peer sr-only"
              onChange={(e) => {
                const selected = e.currentTarget.files?.[0] ?? null;
                setFile(selected);
                if (selected && titleRef.current && titleRef.current.value.trim() === "") {
                  titleRef.current.value = selected.name.replace(/\.txt$/i, "").slice(0, 200);
                }
              }}
            />
            <label
              htmlFor="file"
              className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg bg-royal-50 px-3 text-sm font-medium text-royal-700 hover:bg-royal-100 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-royal-600"
            >
              <FileText className="size-4" aria-hidden="true" />
              {file ? "Trocar arquivo" : "Escolher arquivo"}
            </label>
            <span className="min-w-0 text-sm text-slate-600" aria-live="polite">
              {file ? (
                <>
                  <span className="break-all font-medium text-navy-900">{file.name}</span> · {formatBytes(file.size)}
                </>
              ) : (
                "Nenhum arquivo selecionado"
              )}
            </span>
          </div>
        </Field>
      ) : (
        <Field
          id="text"
          label="Texto da transcrição"
          required
          error={textProblem ?? fieldError(state, "text")}
          hint={`${formatNumber(charCount)} caracteres · ${formatNumber(countWords(deferredText))} palavras`}
        >
          <Textarea
            id="text"
            name="text"
            rows={14}
            required
            hasHint
            value={text}
            onChange={(e) => setText(e.currentTarget.value)}
            error={textProblem ?? undefined}
            placeholder="Cole aqui a transcrição completa da aula."
            className="font-[inherit] leading-relaxed"
          />
        </Field>
      )}

      <FormMessage state={state} />

      <SubmitButton pendingLabel="Importando..." className="w-full sm:w-auto" disabled={blocked}>
        Importar transcrição
      </SubmitButton>
      {blocked ? <p className="text-sm text-slate-500">Selecione um arquivo válido ou cole o texto para continuar.</p> : null}
    </form>
  );
}
