"use client";

import { Check, Copy, Pencil, Printer, RotateCcw } from "lucide-react";
import { useActionState, useState } from "react";
import { restoreOriginalAction, saveTranscriptEditAction } from "@/app/(app)/aulas/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { FormMessage, SubmitButton } from "@/components/ui/form-controls";
import { IDLE_STATE, fieldError, submittedValue, type ActionState } from "@/lib/actions";

export function TranscriptViewer({
  lessonId,
  originalText,
  editedText,
  editedAtLabel,
}: {
  lessonId: string;
  originalText: string;
  editedText: string | null;
  editedAtLabel: string | null;
}) {
  const hasEdit = editedText !== null;
  const [showOriginal, setShowOriginal] = useState(false);
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState<"ok" | "fail" | null>(null);
  const [lastAction, setLastAction] = useState<"save" | "restore" | null>(null);

  const [saveState, saveAction] = useActionState(async (prev: ActionState, fd: FormData) => {
    const result = await saveTranscriptEditAction(prev, fd);
    setLastAction("save");
    if (result.status === "success") {
      setEditing(false);
      setShowOriginal(false);
    }
    return result;
  }, IDLE_STATE);
  const [restoreState, restoreAction] = useActionState(async (prev: ActionState, fd: FormData) => {
    const result = await restoreOriginalAction(prev, fd);
    setLastAction("restore");
    if (result.status === "success") setShowOriginal(false);
    return result;
  }, IDLE_STATE);

  const displayed = hasEdit && !showOriginal ? editedText : originalText;
  const lastState = lastAction === "restore" ? restoreState : lastAction === "save" ? saveState : IDLE_STATE;

  async function copy() {
    try {
      await navigator.clipboard.writeText(displayed);
      setCopied("ok");
    } catch {
      setCopied("fail");
    }
    setTimeout(() => setCopied(null), 2500);
  }

  if (editing) {
    return (
      <form action={saveAction} className="space-y-4" noValidate>
        <input type="hidden" name="lessonId" value={lessonId} />
        <p className="text-sm text-slate-600">
          Você está editando a <strong>versão revisada</strong>. A transcrição original permanece preservada e pode ser
          restaurada a qualquer momento.
        </p>
        <label htmlFor="transcript-edit" className="sr-only">
          Texto da transcrição revisada
        </label>
        <Textarea
          id="transcript-edit"
          name="text"
          rows={22}
          defaultValue={submittedValue(saveState, "text", editedText ?? originalText)}
          error={fieldError(saveState, "text")}
          className="leading-relaxed"
        />
        {saveState.status === "error" ? <FormMessage state={saveState} /> : null}
        <div className="flex flex-wrap gap-2">
          <SubmitButton pendingLabel="Salvando...">Salvar versão revisada</SubmitButton>
          <Button variant="ghost" onClick={() => setEditing(false)}>
            Cancelar
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center gap-2">
        {hasEdit ? (
          <div className="mr-auto grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 text-sm" role="tablist" aria-label="Versão exibida">
            <button
              type="button"
              role="tab"
              aria-selected={!showOriginal}
              onClick={() => setShowOriginal(false)}
              className={`min-h-9 rounded-lg px-3 font-medium ${!showOriginal ? "bg-white text-royal-700 shadow-sm" : "text-slate-600"}`}
            >
              Revisada
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={showOriginal}
              onClick={() => setShowOriginal(true)}
              className={`min-h-9 rounded-lg px-3 font-medium ${showOriginal ? "bg-white text-royal-700 shadow-sm" : "text-slate-600"}`}
            >
              Original
            </button>
          </div>
        ) : (
          <span className="mr-auto text-sm text-slate-500">Exibindo a transcrição original.</span>
        )}
        <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
          <Pencil className="size-4" aria-hidden="true" /> Editar
        </Button>
        <Button variant="secondary" size="sm" onClick={copy}>
          {copied === "ok" ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
          {copied === "ok" ? "Copiado" : "Copiar"}
        </Button>
        <Button variant="secondary" size="sm" onClick={() => window.print()}>
          <Printer className="size-4" aria-hidden="true" /> Imprimir
        </Button>
        {hasEdit ? (
          <form action={restoreAction}>
            <input type="hidden" name="lessonId" value={lessonId} />
            <SubmitButton
              variant="ghost"
              size="sm"
              pendingLabel="Restaurando..."
              confirmMessage="Descartar a versão revisada e voltar a exibir a transcrição original?"
            >
              <RotateCcw className="size-4" aria-hidden="true" /> Restaurar original
            </SubmitButton>
          </form>
        ) : null}
      </div>

      {copied === "fail" ? (
        <p role="alert" className="no-print text-sm text-red-700">
          Não foi possível copiar automaticamente. Selecione o texto e copie manualmente.
        </p>
      ) : null}
      {lastState.status !== "idle" ? (
        <div className="no-print">
          <FormMessage state={lastState} />
        </div>
      ) : null}

      {hasEdit && !showOriginal && editedAtLabel ? (
        <p className="text-xs text-slate-500">Versão revisada em {editedAtLabel}.</p>
      ) : null}
      {showOriginal ? <p className="text-xs text-slate-500">Texto original, exatamente como foi importado.</p> : null}

      <article className="transcript-text rounded-xl bg-slate-50/70 p-4 text-[0.98rem] text-slate-800 sm:p-5" aria-label="Transcrição">
        {displayed}
      </article>
    </div>
  );
}
