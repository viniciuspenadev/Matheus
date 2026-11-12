"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { errorState, type ActionState } from "@/lib/actions";
import { normalizeTranscript } from "@/lib/text/transcript";
import { fieldErrorsOf, formDataToRecord } from "@/lib/validation/common";
import {
  importExistingLessonSchema,
  importNewLessonSchema,
  lessonSchema,
  transcriptEditSchema,
} from "@/lib/validation/schemas";
import { isUuid, userMessageOf } from "@/server/action-utils";
import { createLesson, deleteLesson, updateLesson } from "@/server/lessons";
import { readTranscriptFromForm } from "@/server/transcript-input";
import {
  importTranscription,
  restoreOriginalTranscription,
  saveEditedTranscription,
} from "@/server/transcriptions";

const REVIEW_FIELDS = "Revise os campos destacados.";

// ----------------------------------------------------------------------------
// Aulas
// ----------------------------------------------------------------------------

export async function createLessonAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = formDataToRecord(formData);
  const parsed = lessonSchema.safeParse(values);
  if (!parsed.success) {
    return errorState(REVIEW_FIELDS, { fieldErrors: fieldErrorsOf(parsed.error), values });
  }
  let id: string;
  try {
    id = await createLesson(parsed.data);
  } catch (err) {
    return errorState(userMessageOf(err), { values });
  }
  revalidatePath("/", "layout");
  redirect(`/aulas/${id}`);
}

export async function updateLessonAction(
  lessonId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!isUuid(lessonId)) return errorState("Aula inválida.");
  const values = formDataToRecord(formData);
  const parsed = lessonSchema.safeParse(values);
  if (!parsed.success) {
    return errorState(REVIEW_FIELDS, { fieldErrors: fieldErrorsOf(parsed.error), values });
  }
  try {
    await updateLesson(lessonId, parsed.data);
  } catch (err) {
    return errorState(userMessageOf(err), { values });
  }
  revalidatePath("/", "layout");
  redirect(`/aulas/${lessonId}`);
}

export async function deleteLessonAction(lessonId: string, _prev: ActionState): Promise<ActionState> {
  if (!isUuid(lessonId)) return errorState("Aula inválida.");
  try {
    await deleteLesson(lessonId);
  } catch (err) {
    return errorState(userMessageOf(err));
  }
  revalidatePath("/", "layout");
  redirect("/aulas");
}

// ----------------------------------------------------------------------------
// Importação de transcrição
// ----------------------------------------------------------------------------

/** "Importar transcrição": cria a aula e grava o texto em uma única operação. */
export async function importNewLessonAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = formDataToRecord(formData);
  const parsed = importNewLessonSchema.safeParse(values);
  if (!parsed.success) {
    return errorState(REVIEW_FIELDS, { fieldErrors: fieldErrorsOf(parsed.error), values });
  }

  let lessonId: string;
  try {
    const input = await readTranscriptFromForm(formData, parsed.data.mode);
    lessonId = await importTranscription({
      text: input.text,
      source: input.source,
      sourceFilename: input.filename,
      newLesson: {
        subjectId: parsed.data.subjectId,
        title: parsed.data.title,
        lessonDate: parsed.data.lessonDate,
      },
    });
  } catch (err) {
    return errorState(userMessageOf(err), { values });
  }

  revalidatePath("/", "layout");
  redirect(`/aulas/${lessonId}?importado=1`);
}

/** Importa a transcrição para uma aula já criada (em rascunho). */
export async function importIntoLessonAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = formDataToRecord(formData);
  const parsed = importExistingLessonSchema.safeParse(values);
  if (!parsed.success) {
    return errorState(REVIEW_FIELDS, { fieldErrors: fieldErrorsOf(parsed.error), values });
  }

  try {
    const input = await readTranscriptFromForm(formData, parsed.data.mode);
    await importTranscription({
      text: input.text,
      source: input.source,
      sourceFilename: input.filename,
      lessonId: parsed.data.lessonId,
    });
  } catch (err) {
    return errorState(userMessageOf(err), { values });
  }

  revalidatePath("/", "layout");
  redirect(`/aulas/${parsed.data.lessonId}?importado=1`);
}

// ----------------------------------------------------------------------------
// Edição da transcrição
// ----------------------------------------------------------------------------

export async function saveTranscriptEditAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = formDataToRecord(formData);
  const parsed = transcriptEditSchema.safeParse(values);
  if (!parsed.success) {
    return errorState(REVIEW_FIELDS, { fieldErrors: fieldErrorsOf(parsed.error), values });
  }
  try {
    await saveEditedTranscription(parsed.data.lessonId, normalizeTranscript(parsed.data.text));
  } catch (err) {
    return errorState(userMessageOf(err), { values });
  }
  revalidatePath(`/aulas/${parsed.data.lessonId}`);
  revalidatePath("/");
  return { status: "success", message: "Versão revisada salva. A transcrição original continua preservada." };
}

export async function restoreOriginalAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const lessonId = formData.get("lessonId");
  if (!isUuid(lessonId)) return errorState("Aula inválida.");
  try {
    await restoreOriginalTranscription(lessonId);
  } catch (err) {
    return errorState(userMessageOf(err));
  }
  revalidatePath(`/aulas/${lessonId}`);
  revalidatePath("/");
  return { status: "success", message: "A versão revisada foi descartada. Exibindo a transcrição original." };
}
