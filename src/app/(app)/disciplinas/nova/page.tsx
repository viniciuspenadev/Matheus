import type { Metadata } from "next";
import { SubjectForm } from "@/components/forms/subject-form";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { listCourses } from "@/server/subjects";
import { createSubjectAction } from "../actions";

export const metadata: Metadata = { title: "Nova disciplina" };

export default async function NewSubjectPage() {
  const courses = await listCourses();
  return (
    <>
      <PageHeader title="Nova disciplina" back={{ href: "/disciplinas", label: "Disciplinas" }} />
      <Card className="max-w-2xl">
        <SubjectForm
          action={createSubjectAction}
          courses={courses.map((c) => ({ id: c.id, name: c.name }))}
          submitLabel="Cadastrar disciplina"
          cancelHref="/disciplinas"
        />
      </Card>
    </>
  );
}
