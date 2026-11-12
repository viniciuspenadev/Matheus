import "server-only";

import { requireUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { throwDbError } from "./errors";

export interface ImportTranscriptionParams {
  text: string;
  source: "text_file" | "text_paste";
  sourceFilename?: string | null;
  /** Importar para uma aula existente (em rascunho)... */
  lessonId?: string;
  /** ...ou criar uma nova aula com estes dados. */
  newLesson?: { subjectId: string; title: string; lessonDate: string | null };
}

/**
 * Grava a transcrição original via RPC atômica (cria a aula quando necessário).
 * Retorna o id da aula.
 */
export async function importTranscription(params: ImportTranscriptionParams): Promise<string> {
  await requireUser();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("import_transcription", {
    p_text: params.text,
    p_source: params.source,
    p_source_filename: params.sourceFilename ?? undefined,
    p_lesson_id: params.lessonId,
    p_subject_id: params.newLesson?.subjectId,
    p_title: params.newLesson?.title,
    p_lesson_date: params.newLesson?.lessonDate ?? undefined,
  });
  if (error) throwDbError(error, {}, true);
  if (!data) throwDbError({ code: "PGRST116", message: "import returned no lesson id" });
  return data;
}

/** Salva a versão revisada. A transcrição original nunca é alterada. */
export async function saveEditedTranscription(lessonId: string, text: string): Promise<void> {
  await requireUser();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("transcriptions")
    .update({ edited_text: text })
    .eq("lesson_id", lessonId)
    .select("id");
  if (error) throwDbError(error);
  if (!data || data.length === 0) throwDbError({ code: "PGRST116", message: "transcription not found" });
}

/** Descarta a versão revisada e volta a exibir a original. */
export async function restoreOriginalTranscription(lessonId: string): Promise<void> {
  await requireUser();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("transcriptions")
    .update({ edited_text: null })
    .eq("lesson_id", lessonId)
    .select("id");
  if (error) throwDbError(error);
  if (!data || data.length === 0) throwDbError({ code: "PGRST116", message: "transcription not found" });
}
