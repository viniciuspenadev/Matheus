import type { Metadata } from "next";
import { CreateCourseForm, EditCourseRow } from "@/components/forms/course-forms";
import { PageHeader } from "@/components/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { listCourses } from "@/server/subjects";
import { createCourseAction, deleteCourseAction, updateCourseAction } from "../actions";

export const metadata: Metadata = { title: "Cursos" };

export default async function CoursesPage() {
  const courses = await listCourses();

  return (
    <>
      <PageHeader
        title="Cursos"
        description="Agrupe disciplinas por curso ou instituição (opcional)."
        back={{ href: "/disciplinas", label: "Disciplinas" }}
      />
      <div className="grid max-w-3xl gap-6">
        <Card>
          <CardHeader title="Novo curso" />
          <CreateCourseForm action={createCourseAction} />
        </Card>
        <Card>
          <CardHeader title="Cursos cadastrados" />
          {courses.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhum curso cadastrado.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {courses.map((course) => (
                <EditCourseRow
                  key={course.id}
                  course={course}
                  updateAction={updateCourseAction.bind(null, course.id)}
                  deleteAction={deleteCourseAction.bind(null, course.id)}
                />
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
