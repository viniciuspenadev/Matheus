import { FilePlus2, ListVideo } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { LessonStatusBadge } from "@/components/ui/badge";
import { Button, LinkButton } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/states";
import { formatCalendarDate, plural } from "@/lib/format";
import { isUuid } from "@/server/action-utils";
import { listLessons } from "@/server/lessons";
import { listSubjects } from "@/server/subjects";

export const metadata: Metadata = { title: "Aulas" };

export default async function LessonsPage({ searchParams }: PageProps<"/aulas">) {
  const params = await searchParams;
  const subjectId = typeof params.disciplina === "string" && isUuid(params.disciplina) ? params.disciplina : undefined;
  const [lessons, subjects] = await Promise.all([listLessons({ subjectId }), listSubjects()]);
  const currentSubject = subjects.find((s) => s.id === subjectId);

  return (
    <>
      <PageHeader
        title="Aulas"
        description={currentSubject ? `Aulas de ${currentSubject.name}` : "Todas as aulas cadastradas."}
        actions={
          subjects.length > 0 ? (
            <LinkButton href={subjectId ? `/aulas/nova?disciplina=${subjectId}` : "/aulas/nova"}>
              <FilePlus2 className="size-4" aria-hidden="true" /> Nova aula
            </LinkButton>
          ) : null
        }
      />

      {subjects.length > 0 ? (
        <form method="get" className="mb-5 flex flex-wrap items-end gap-2" role="search" aria-label="Filtrar aulas">
          <div className="min-w-0 flex-1 sm:max-w-xs">
            <label htmlFor="disciplina" className="mb-1.5 block text-sm font-medium text-navy-900">
              Disciplina
            </label>
            <Select id="disciplina" name="disciplina" defaultValue={subjectId ?? ""}>
              <option value="">Todas as disciplinas</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
          <Button type="submit" variant="secondary">
            Filtrar
          </Button>
        </form>
      ) : null}

      {subjects.length === 0 ? (
        <EmptyState
          icon={<ListVideo className="size-6" />}
          title="Cadastre uma disciplina primeiro"
          description="Cada aula pertence a uma disciplina."
          action={<LinkButton href="/disciplinas/nova">Cadastrar disciplina</LinkButton>}
        />
      ) : lessons.length === 0 ? (
        <EmptyState
          icon={<ListVideo className="size-6" />}
          title="Nenhuma aula encontrada"
          description="Importe uma transcrição pronta ou crie uma aula."
          action={
            <LinkButton href={subjectId ? `/importar?disciplina=${subjectId}` : "/importar"}>Importar transcrição</LinkButton>
          }
        />
      ) : (
        <>
          <p className="mb-2 text-sm text-slate-500">{plural(lessons.length, "aula", "aulas")}</p>
          <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
            {lessons.map((lesson) => (
              <li key={lesson.id}>
                <Link
                  href={`/aulas/${lesson.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-royal-50/40 sm:px-5"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-navy-900">{lesson.title}</span>
                    <span className="block truncate text-sm text-slate-500">
                      {lesson.subjectName} · {formatCalendarDate(lesson.lessonDate)}
                    </span>
                  </span>
                  <LessonStatusBadge status={lesson.status} />
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
