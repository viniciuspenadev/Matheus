import "server-only";

import { requireUser } from "@/lib/auth/session";
import type { LessonStatus } from "@/lib/lessons/status";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { LessonInput } from "@/lib/validation/schemas";
import { throwDbError } from "./errors";

export interface LessonSummary {
  id: string;
  title: string;
  lessonDate: string | null;
  status: LessonStatus;
  sourceType: "audio" | "text" | null;
  subjectId: string;
  subjectName: string;
  createdAt: string;
  updatedAt: string;
}

const LESSON_SUMMARY_COLUMNS =
  "id, title, lesson_date, status, source_type, subject_id, created_at, updated_at, subjects(name)" as const;

type LessonSummaryRow = {
  id: string;
  title: string;
  lesson_date: string | null;
  status: string;
  source_type: string | null;
  subject_id: string;
  created_at: string;
  updated_at: string;
  subjects: { name: string } | null;
};

function toSummary(row: LessonSummaryRow): LessonSummary {
  return {
    id: row.id,
    title: row.title,
    lessonDate: row.lesson_date,
    status: row.status as LessonStatus,
    sourceType: row.source_type as LessonSummary["sourceType"],
    subjectId: row.subject_id,
    subjectName: row.subjects?.name ?? "—",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listLessons(options: { subjectId?: string; limit?: number } = {}): Promise<LessonSummary[]> {
  await requireUser();
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("lessons")
    .select(LESSON_SUMMARY_COLUMNS)
    .order("lesson_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (options.subjectId) query = query.eq("subject_id", options.subjectId);
  if (options.limit) query = query.limit(options.limit);
  const { data, error } = await query;
  if (error) throwDbError(error);
  return (data ?? []).map(toSummary);
}

export interface TranscriptionView {
  id: string;
  source: "audio" | "text_file" | "text_paste";
  originalText: string;
  editedText: string | null;
  editedAt: string | null;
  sourceFilename: string | null;
  wordCount: number;
  charCount: number;
  integrityStatus: "not_applicable" | "verified" | "incomplete";
  createdAt: string;
}

export interface LessonDetail extends LessonSummary {
  notes: string | null;
  statusMessage: string | null;
  lastError: string | null;
  transcription: TranscriptionView | null;
}

export async function getLesson(id: string): Promise<LessonDetail | null> {
  await requireUser();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("lessons")
    .select(`${LESSON_SUMMARY_COLUMNS}, notes, status_message, last_error`)
    .eq("id", id)
    .maybeSingle();
  if (error) throwDbError(error);
  if (!data) return null;

  const { data: tr, error: trError } = await supabase
    .from("transcriptions")
    .select(
      "id, source, original_text, edited_text, edited_at, source_filename, word_count, char_count, integrity_status, created_at",
    )
    .eq("lesson_id", id)
    .maybeSingle();
  if (trError) throwDbError(trError);

  return {
    ...toSummary(data),
    notes: data.notes,
    statusMessage: data.status_message,
    lastError: data.last_error,
    transcription: tr
      ? {
          id: tr.id,
          source: tr.source as TranscriptionView["source"],
          originalText: tr.original_text,
          editedText: tr.edited_text,
          editedAt: tr.edited_at,
          sourceFilename: tr.source_filename,
          wordCount: tr.word_count,
          charCount: tr.char_count,
          integrityStatus: tr.integrity_status as TranscriptionView["integrityStatus"],
          createdAt: tr.created_at,
        }
      : null,
  };
}

const LESSON_MESSAGES = { "23503": "A disciplina selecionada não foi encontrada." };

export async function createLesson(input: LessonInput): Promise<string> {
  await requireUser();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("lessons")
    .insert({ subject_id: input.subjectId, title: input.title, lesson_date: input.lessonDate, notes: input.notes })
    .select("id")
    .single();
  if (error) throwDbError(error, LESSON_MESSAGES);
  return data.id;
}

export async function updateLesson(id: string, input: LessonInput): Promise<void> {
  await requireUser();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("lessons")
    .update({ subject_id: input.subjectId, title: input.title, lesson_date: input.lessonDate, notes: input.notes })
    .eq("id", id)
    .select("id");
  if (error) throwDbError(error, LESSON_MESSAGES);
  if (!data || data.length === 0) throwDbError({ code: "PGRST116", message: "lesson not found" });
}

export async function deleteLesson(id: string): Promise<void> {
  await requireUser();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("lessons").delete().eq("id", id).select("id");
  if (error) throwDbError(error);
  if (!data || data.length === 0) throwDbError({ code: "PGRST116", message: "lesson not found" });
}
