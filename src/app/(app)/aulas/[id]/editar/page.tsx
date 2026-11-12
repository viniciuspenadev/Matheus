import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DeleteForm } from "@/components/forms/delete-form";
import { LessonForm } from "@/components/forms/lesson-form";
import { PageHeader } from "@/components/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { isUuid } from "@/server/action-utils";
import { getLesson } from "@/server/lessons";
import { listSubjects } from "@/server/subjects";
import { deleteLessonAction, updateLessonAction } from "../../actions";

export const metadata: Metadata = { title: "Editar aula" };

export default async function EditLessonPage({ params }: PageProps<"/aulas/[id]/editar">) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const [lesson, subjects] = await Promise.all([getLesson(id), listSubjects()]);
  if (!lesson) notFound();

  return (
    <>
      <PageHeader title="Editar aula" back={{ href: `/aulas/${id}`, label: lesson.title }} />
      <div className="grid max-w-2xl gap-6">
        <Card>
          <LessonForm
            action={updateLessonAction.bind(null, id)}
            subjects={subjects.map((s) => ({ id: s.id, name: s.name }))}
            defaults={{
              subjectId: lesson.subjectId,
              title: lesson.title,
              lessonDate: lesson.lessonDate ?? "",
              notes: lesson.notes ?? "",
            }}
            submitLabel="Salvar alterações"
            cancelHref={`/aulas/${id}`}
          />
        </Card>
        <Card>
          <CardHeader
            title="Excluir aula"
            description="Remove a aula e todo o conteúdo associado (transcrição e materiais). Esta ação não pode ser desfeita."
          />
          <DeleteForm
            action={deleteLessonAction.bind(null, id)}
            label="Excluir aula"
            confirmMessage={`Excluir definitivamente a aula “${lesson.title}” e sua transcrição?`}
            size="sm"
          />
        </Card>
      </div>
    </>
  );
}
