import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SubjectForm } from "@/components/forms/subject-form";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { isUuid } from "@/server/action-utils";
import { getSubject, listCourses } from "@/server/subjects";
import { updateSubjectAction } from "../../actions";

export const metadata: Metadata = { title: "Editar disciplina" };

export default async function EditSubjectPage({ params }: PageProps<"/disciplinas/[id]/editar">) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const [subject, courses] = await Promise.all([getSubject(id), listCourses()]);
  if (!subject) notFound();

  return (
    <>
      <PageHeader title="Editar disciplina" back={{ href: `/disciplinas/${id}`, label: subject.name }} />
      <Card className="max-w-2xl">
        <SubjectForm
          action={updateSubjectAction.bind(null, id)}
          courses={courses.map((c) => ({ id: c.id, name: c.name }))}
          defaults={{
            name: subject.name,
            code: subject.code ?? "",
            professor: subject.professor ?? "",
            description: subject.description ?? "",
            courseId: subject.courseId ?? "",
            keywords: subject.keywords.join(", "),
          }}
          submitLabel="Salvar alterações"
          cancelHref={`/disciplinas/${id}`}
        />
      </Card>
    </>
  );
}
