"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { errorState, type ActionState } from "@/lib/actions";
import { fieldErrorsOf, formDataToRecord } from "@/lib/validation/common";
import { courseSchema, subjectSchema } from "@/lib/validation/schemas";
import { isUuid, userMessageOf } from "@/server/action-utils";
import {
  createCourse,
  createSubject,
  deleteCourse,
  deleteSubject,
  updateCourse,
  updateSubject,
} from "@/server/subjects";

const REVIEW_FIELDS = "Revise os campos destacados.";

export async function createSubjectAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = formDataToRecord(formData);
  const parsed = subjectSchema.safeParse(values);
  if (!parsed.success) {
    return errorState(REVIEW_FIELDS, { fieldErrors: fieldErrorsOf(parsed.error), values });
  }
  let id: string;
  try {
    id = await createSubject(parsed.data);
  } catch (err) {
    return errorState(userMessageOf(err), { values });
  }
  revalidatePath("/", "layout");
  redirect(`/disciplinas/${id}`);
}

export async function updateSubjectAction(
  subjectId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!isUuid(subjectId)) return errorState("Disciplina inválida.");
  const values = formDataToRecord(formData);
  const parsed = subjectSchema.safeParse(values);
  if (!parsed.success) {
    return errorState(REVIEW_FIELDS, { fieldErrors: fieldErrorsOf(parsed.error), values });
  }
  try {
    await updateSubject(subjectId, parsed.data);
  } catch (err) {
    return errorState(userMessageOf(err), { values });
  }
  revalidatePath("/", "layout");
  redirect(`/disciplinas/${subjectId}`);
}

export async function deleteSubjectAction(subjectId: string, _prev: ActionState): Promise<ActionState> {
  if (!isUuid(subjectId)) return errorState("Disciplina inválida.");
  try {
    await deleteSubject(subjectId);
  } catch (err) {
    return errorState(userMessageOf(err));
  }
  revalidatePath("/", "layout");
  redirect("/disciplinas");
}

// ----------------------------------------------------------------------------
// Cursos
// ----------------------------------------------------------------------------

export async function createCourseAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = formDataToRecord(formData);
  const parsed = courseSchema.safeParse(values);
  if (!parsed.success) {
    return errorState(REVIEW_FIELDS, { fieldErrors: fieldErrorsOf(parsed.error), values });
  }
  try {
    await createCourse(parsed.data);
  } catch (err) {
    return errorState(userMessageOf(err), { values });
  }
  revalidatePath("/disciplinas", "layout");
  return { status: "success", message: `Curso “${parsed.data.name}” criado.` };
}

export async function updateCourseAction(
  courseId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!isUuid(courseId)) return errorState("Curso inválido.");
  const values = formDataToRecord(formData);
  const parsed = courseSchema.safeParse(values);
  if (!parsed.success) {
    return errorState(REVIEW_FIELDS, { fieldErrors: fieldErrorsOf(parsed.error), values });
  }
  try {
    await updateCourse(courseId, parsed.data);
  } catch (err) {
    return errorState(userMessageOf(err), { values });
  }
  revalidatePath("/disciplinas", "layout");
  return { status: "success", message: "Curso atualizado." };
}

export async function deleteCourseAction(courseId: string, _prev: ActionState): Promise<ActionState> {
  if (!isUuid(courseId)) return errorState("Curso inválido.");
  try {
    await deleteCourse(courseId);
  } catch (err) {
    return errorState(userMessageOf(err));
  }
  revalidatePath("/disciplinas", "layout");
  return { status: "success", message: "Curso excluído. As disciplinas foram mantidas, sem curso." };
}
