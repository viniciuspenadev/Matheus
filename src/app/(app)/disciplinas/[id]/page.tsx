import { FilePlus2, FileUp, Pencil } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteForm } from "@/components/forms/delete-form";
import { PageHeader } from "@/components/page-header";
import { LessonStatusBadge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { formatCalendarDate, plural } from "@/lib/format";
import { isUuid } from "@/server/action-utils";
import { listLessons } from "@/server/lessons";
import { getSubject } from "@/server/subjects";
import { deleteSubjectAction } from "../actions";

export async function generateMetadata({ params }: PageProps<"/disciplinas/[id]">): Promise<Metadata> {
  const { id } = await params;
  const subject = isUuid(id) ? await getSubject(id) : null;
  return { title: subject?.name ?? "Disciplina" };
}

export default async function SubjectPage({ params }: PageProps<"/disciplinas/[id]">) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const [subject, lessons] = await Promise.all([getSubject(id), listLessons({ subjectId: id })]);
  if (!subject) notFound();

  return (
    <>
      <PageHeader
        title={subject.name}
        back={{ href: "/disciplinas", label: "Disciplinas" }}
        description={[subject.code, subject.professor, subject.courseName].filter(Boolean).join(" · ") || undefined}
        actions={
          <>
            <LinkButton href={`/importar?disciplina=${subject.id}`}>
              <FileUp className="size-4" aria-hidden="true" /> Importar transcrição
            </LinkButton>
            <LinkButton href={`/aulas/nova?disciplina=${subject.id}`} variant="secondary">
              <FilePlus2 className="size-4" aria-hidden="true" /> Nova aula
            </LinkButton>
            <LinkButton href={`/disciplinas/${subject.id}/editar`} variant="secondary">
              <Pencil className="size-4" aria-hidden="true" /> Editar
            </LinkButton>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Card>
          <CardHeader title="Aulas" description={plural(lessons.length, "aula", "aulas")} />
          {lessons.length === 0 ? (
            <EmptyState
              title="Nenhuma aula nesta disciplina"
              description="Importe uma transcrição pronta ou crie a aula para enviar o conteúdo depois."
              action={
                <LinkButton href={`/importar?disciplina=${subject.id}`} size="sm">
                  Importar transcrição
                </LinkButton>
              }
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {lessons.map((lesson) => (
                <li key={lesson.id}>
                  <Link href={`/aulas/${lesson.id}`} className="flex items-center justify-between gap-3 py-3 hover:text-royal-700">
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-navy-900">{lesson.title}</span>
                      <span className="block text-sm text-slate-500">{formatCalendarDate(lesson.lessonDate)}</span>
                    </span>
                    <LessonStatusBadge status={lesson.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Vocabulário científico" description="Contexto para a transcrição de áudio." as="h3" />
            {subject.keywords.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhum termo cadastrado.</p>
            ) : (
              <ul className="flex flex-wrap gap-1.5">
                {subject.keywords.map((k) => (
                  <li key={k} className="rounded-full bg-royal-50 px-2.5 py-1 text-sm text-royal-700">
                    {k}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {subject.description ? (
            <Card>
              <CardHeader title="Descrição" as="h3" />
              <p className="whitespace-pre-wrap text-sm text-slate-700">{subject.description}</p>
            </Card>
          ) : null}

          <Card>
            <CardHeader title="Excluir disciplina" as="h3" />
            {subject.lessonCount > 0 ? (
              <p className="text-sm text-slate-600">
                Esta disciplina possui {plural(subject.lessonCount, "aula", "aulas")}. Para proteger suas transcrições,
                exclua ou mova as aulas antes de excluir a disciplina.
              </p>
            ) : (
              <DeleteForm
                action={deleteSubjectAction.bind(null, subject.id)}
                label="Excluir disciplina"
                confirmMessage={`Excluir definitivamente a disciplina “${subject.name}”?`}
                size="sm"
              />
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
