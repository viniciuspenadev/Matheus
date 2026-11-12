import "server-only";

import { requireUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CourseInput, SubjectInput } from "@/lib/validation/schemas";
import { throwDbError } from "./errors";

const SUBJECT_MESSAGES = {
  "23505": "Já existe uma disciplina com esse nome.",
  "23503": "O curso selecionado não foi encontrado.",
};

export interface SubjectSummary {
  id: string;
  name: string;
  code: string | null;
  professor: string | null;
  keywords: string[];
  courseId: string | null;
  courseName: string | null;
  lessonCount: number;
}

export async function listSubjects(): Promise<SubjectSummary[]> {
  await requireUser();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("subjects")
    .select("id, name, code, professor, keywords, course_id, courses(name), lessons(count)")
    .order("name", { ascending: true });
  if (error) throwDbError(error);
  return (data ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    code: s.code,
    professor: s.professor,
    keywords: s.keywords,
    courseId: s.course_id,
    courseName: s.courses?.name ?? null,
    lessonCount: s.lessons[0]?.count ?? 0,
  }));
}

export interface SubjectDetail extends SubjectSummary {
  description: string | null;
  createdAt: string;
}

export async function getSubject(id: string): Promise<SubjectDetail | null> {
  await requireUser();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("subjects")
    .select("id, name, code, professor, description, keywords, course_id, created_at, courses(name), lessons(count)")
    .eq("id", id)
    .maybeSingle();
  if (error) throwDbError(error);
  if (!data) return null;
  return {
    id: data.id,
    name: data.name,
    code: data.code,
    professor: data.professor,
    description: data.description,
    keywords: data.keywords,
    courseId: data.course_id,
    courseName: data.courses?.name ?? null,
    lessonCount: data.lessons[0]?.count ?? 0,
    createdAt: data.created_at,
  };
}

function subjectRow(input: SubjectInput) {
  return {
    name: input.name,
    code: input.code,
    professor: input.professor,
    description: input.description,
    course_id: input.courseId,
    keywords: input.keywords,
  };
}

export async function createSubject(input: SubjectInput): Promise<string> {
  await requireUser();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("subjects").insert(subjectRow(input)).select("id").single();
  if (error) throwDbError(error, SUBJECT_MESSAGES);
  return data.id;
}

export async function updateSubject(id: string, input: SubjectInput): Promise<void> {
  await requireUser();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("subjects").update(subjectRow(input)).eq("id", id).select("id");
  if (error) throwDbError(error, SUBJECT_MESSAGES);
  if (!data || data.length === 0) throwDbError({ code: "PGRST116", message: "subject not found" });
}

export async function deleteSubject(id: string): Promise<void> {
  await requireUser();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("subjects").delete().eq("id", id).select("id");
  if (error) {
    throwDbError(error, {
      "23503": "Esta disciplina possui aulas. Exclua ou mova as aulas antes de excluir a disciplina.",
    });
  }
  if (!data || data.length === 0) throwDbError({ code: "PGRST116", message: "subject not found" });
}

// ----------------------------------------------------------------------------
// Cursos
// ----------------------------------------------------------------------------

export interface CourseSummary {
  id: string;
  name: string;
  institution: string | null;
  subjectCount: number;
}

export async function listCourses(): Promise<CourseSummary[]> {
  await requireUser();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("courses")
    .select("id, name, institution, subjects(count)")
    .order("name", { ascending: true });
  if (error) throwDbError(error);
  return (data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    institution: c.institution,
    subjectCount: c.subjects[0]?.count ?? 0,
  }));
}

const COURSE_MESSAGES = { "23505": "Já existe um curso com esse nome." };

export async function createCourse(input: CourseInput): Promise<void> {
  await requireUser();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("courses").insert({ name: input.name, institution: input.institution });
  if (error) throwDbError(error, COURSE_MESSAGES);
}

export async function updateCourse(id: string, input: CourseInput): Promise<void> {
  await requireUser();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("courses")
    .update({ name: input.name, institution: input.institution })
    .eq("id", id)
    .select("id");
  if (error) throwDbError(error, COURSE_MESSAGES);
  if (!data || data.length === 0) throwDbError({ code: "PGRST116", message: "course not found" });
}

export async function deleteCourse(id: string): Promise<void> {
  await requireUser();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("courses").delete().eq("id", id).select("id");
  if (error) throwDbError(error);
  if (!data || data.length === 0) throwDbError({ code: "PGRST116", message: "course not found" });
}
