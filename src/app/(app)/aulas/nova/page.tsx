import type { Metadata } from "next";
import { LessonForm } from "@/components/forms/lesson-form";
import { PageHeader } from "@/components/page-header";
import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { isUuid } from "@/server/action-utils";
import { listSubjects } from "@/server/subjects";
import { createLessonAction } from "../actions";

export const metadata: Metadata = { title: "Nova aula" };

export default async function NewLessonPage({ searchParams }: PageProps<"/aulas/nova">) {
  const params = await searchParams;
  const preselected = typeof params.disciplina === "string" && isUuid(params.disciplina) ? params.disciplina : "";
  const subjects = await listSubjects();

  return (
    <>
      <PageHeader
        title="Nova aula"
        description="Crie a aula agora e adicione a transcrição em seguida."
        back={{ href: "/aulas", label: "Aulas" }}
      />
      {subjects.length === 0 ? (
        <EmptyState
          title="Cadastre uma disciplina primeiro"
          description="Cada aula pertence a uma disciplina."
          action={<LinkButton href="/disciplinas/nova">Cadastrar disciplina</LinkButton>}
        />
      ) : (
        <Card className="max-w-2xl">
          <LessonForm
            action={createLessonAction}
            subjects={subjects.map((s) => ({ id: s.id, name: s.name }))}
            defaults={{
              subjectId: subjects.some((s) => s.id === preselected) ? preselected : "",
              title: "",
              lessonDate: "",
              notes: "",
            }}
            submitLabel="Criar aula"
            cancelHref="/aulas"
          />
        </Card>
      )}
    </>
  );
}
