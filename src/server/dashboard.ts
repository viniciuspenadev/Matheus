import "server-only";

import { requireUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { throwDbError } from "./errors";
import { listLessons, type LessonSummary } from "./lessons";
import { listSubjects, type SubjectSummary } from "./subjects";

export interface RecentTranscription {
  lessonId: string;
  lessonTitle: string;
  subjectName: string;
  wordCount: number;
  source: string;
  edited: boolean;
  createdAt: string;
}

export interface DashboardData {
  subjects: SubjectSummary[];
  recentLessons: LessonSummary[];
  recentTranscriptions: RecentTranscription[];
  pending: LessonSummary[];
  totals: { subjects: number; lessons: number; transcriptions: number };
}

/** Status que exigem alguma ação do usuário. */
const PENDING_STATUSES = ["draft", "needs_review", "error"] as const;

export async function getDashboardData(): Promise<DashboardData> {
  await requireUser();
  const supabase = await createSupabaseServerClient();

  const [subjects, recentLessons, transcriptionsRes, lessonsCount, pendingRes] = await Promise.all([
    listSubjects(),
    listLessons({ limit: 6 }),
    supabase
      .from("transcriptions")
      .select("lesson_id, word_count, source, edited_at, created_at, lessons(title, subjects(name))", {
        count: "exact",
      })
      .order("created_at", { ascending: false })
      .limit(5),
    supabase.from("lessons").select("id", { count: "exact", head: true }),
    supabase
      .from("lessons")
      .select("id, title, lesson_date, status, source_type, subject_id, created_at, updated_at, subjects(name)")
      .in("status", [...PENDING_STATUSES])
      .order("updated_at", { ascending: false })
      .limit(8),
  ]);

  if (transcriptionsRes.error) throwDbError(transcriptionsRes.error);
  if (lessonsCount.error) throwDbError(lessonsCount.error);
  if (pendingRes.error) throwDbError(pendingRes.error);

  const recentTranscriptions: RecentTranscription[] = (transcriptionsRes.data ?? []).map((t) => ({
    lessonId: t.lesson_id,
    lessonTitle: t.lessons?.title ?? "Aula",
    subjectName: t.lessons?.subjects?.name ?? "—",
    wordCount: t.word_count,
    source: t.source,
    edited: t.edited_at !== null,
    createdAt: t.created_at,
  }));

  const pending: LessonSummary[] = (pendingRes.data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    lessonDate: row.lesson_date,
    status: row.status as LessonSummary["status"],
    sourceType: row.source_type as LessonSummary["sourceType"],
    subjectId: row.subject_id,
    subjectName: row.subjects?.name ?? "—",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  return {
    subjects,
    recentLessons,
    recentTranscriptions,
    pending,
    totals: {
      subjects: subjects.length,
      lessons: lessonsCount.count ?? 0,
      transcriptions: transcriptionsRes.count ?? 0,
    },
  };
}
