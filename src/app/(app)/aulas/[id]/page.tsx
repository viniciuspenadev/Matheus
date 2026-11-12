import { CalendarDays, FileText, Pencil } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TranscriptImportForm } from "@/components/forms/transcript-import-form";
import { PageHeader } from "@/components/page-header";
import { TranscriptViewer } from "@/components/transcript-viewer";
import { LessonStatusBadge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Notice } from "@/components/ui/states";
import { getAppTimeZone } from "@/lib/env";
import { formatCalendarDate, formatDateTime, formatNumber, readingMinutes } from "@/lib/format";
import { TRANSCRIPTION_SOURCE_LABEL } from "@/lib/lessons/status";
import { isUuid } from "@/server/action-utils";
import { getLesson } from "@/server/lessons";
import { importIntoLessonAction } from "../actions";

export async function generateMetadata({ params }: PageProps<"/aulas/[id]">): Promise<Metadata> {
  const { id } = await params;
  const lesson = isUuid(id) ? await getLesson(id) : null;
  return { title: lesson?.title ?? "Aula" };
}

export default async function LessonPage({ params, searchParams }: PageProps<"/aulas/[id]">) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const query = await searchParams;
  const lesson = await getLesson(id);
  if (!lesson) notFound();

  const tz = getAppTimeZone();
  const tr = lesson.transcription;

  return (
    <>
      <PageHeader
        title={lesson.title}
        back={{ href: `/aulas?disciplina=${lesson.subjectId}`, label: "Aulas" }}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Link href={`/disciplinas/${lesson.subjectId}`} className="font-medium text-royal-700 hover:underline">
              {lesson.subjectName}
            </Link>
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="size-4" aria-hidden="true" /> {formatCalendarDate(lesson.lessonDate)}
            </span>
            <LessonStatusBadge status={lesson.status} />
          </span>
        }
        actions={
          <LinkButton href={`/aulas/${lesson.id}/editar`} variant="secondary" size="sm">
            <Pencil className="size-4" aria-hidden="true" /> Editar dados
          </LinkButton>
        }
      />

      {query.importado === "1" && tr ? (
        <div className="no-print mb-6">
          <Notice tone="success">
            Transcrição salva com segurança ({formatNumber(tr.wordCount)} palavras). O texto original foi preservado.
          </Notice>
        </div>
      ) : null}

      {lesson.status === "error" && lesson.lastError ? (
        <div className="mb-6">
          <Notice tone="danger">{lesson.lastError}</Notice>
        </div>
      ) : null}

      {lesson.notes ? (
        <Card className="no-print mb-6">
          <CardHeader title="Observações" as="h2" />
          <p className="whitespace-pre-wrap text-sm text-slate-700">{lesson.notes}</p>
        </Card>
      ) : null}

      {tr ? (
        <Card className="print-full">
          <CardHeader
            title="Transcrição"
            description={
              <span className="flex flex-wrap gap-x-3 gap-y-0.5">
                <span>{TRANSCRIPTION_SOURCE_LABEL[tr.source] ?? tr.source}</span>
                {tr.sourceFilename ? <span>{tr.sourceFilename}</span> : null}
                <span>
                  {formatNumber(tr.wordCount)} palavras · {formatNumber(tr.charCount)} caracteres · ~
                  {readingMinutes(tr.wordCount)} min de leitura
                </span>
                <span>Salva em {formatDateTime(tr.createdAt, tz)}</span>
              </span>
            }
          />
          <TranscriptViewer
            lessonId={lesson.id}
            originalText={tr.originalText}
            editedText={tr.editedText}
            editedAtLabel={tr.editedAt ? formatDateTime(tr.editedAt, tz) : null}
          />
        </Card>
      ) : lesson.status === "draft" ? (
        <Card className="max-w-3xl">
          <CardHeader
            title="Adicionar transcrição"
            description="Esta aula ainda não tem conteúdo. Importe um arquivo .txt ou cole o texto da transcrição."
          />
          <TranscriptImportForm action={importIntoLessonAction} variant={{ kind: "existing", lessonId: lesson.id }} />
        </Card>
      ) : (
        <Card>
          <div className="flex items-start gap-3">
            <FileText className="mt-0.5 size-5 text-slate-400" aria-hidden="true" />
            <p className="text-sm text-slate-600">
              {lesson.statusMessage ?? "A transcrição desta aula ainda não está disponível."}
            </p>
          </div>
        </Card>
      )}
    </>
  );
}
