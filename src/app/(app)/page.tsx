import { ArrowRight, BookMarked, FilePlus2, FileText, FileUp, ListVideo } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { LessonStatusBadge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { getAppTimeZone } from "@/lib/env";
import { formatCalendarDate, formatDateTime, formatNumber, plural } from "@/lib/format";
import { TRANSCRIPTION_SOURCE_LABEL } from "@/lib/lessons/status";
import { getDashboardData } from "@/server/dashboard";

export const metadata: Metadata = { title: "Início" };

export default async function DashboardPage() {
  const data = await getDashboardData();
  const tz = getAppTimeZone();

  if (data.totals.subjects === 0) {
    return (
      <>
        <PageHeader title="Bem-vindo ao StudyFlow AI" description="Vamos organizar seus estudos em poucos passos." />
        <EmptyState
          icon={<BookMarked className="size-6" />}
          title="Cadastre sua primeira disciplina"
          description="As aulas, transcrições e materiais ficam organizados por disciplina. Você também pode informar o vocabulário científico de cada uma."
          action={<LinkButton href="/disciplinas/nova">Cadastrar disciplina</LinkButton>}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Painel de estudos"
        description="Suas disciplinas, aulas recentes e o que precisa de atenção."
        actions={
          <>
            <LinkButton href="/importar">
              <FileUp className="size-4" aria-hidden="true" /> Importar transcrição
            </LinkButton>
            <LinkButton href="/aulas/nova" variant="secondary">
              <FilePlus2 className="size-4" aria-hidden="true" /> Nova aula
            </LinkButton>
          </>
        }
      />

      <dl className="mb-6 grid grid-cols-3 gap-3 sm:gap-4">
        {[
          { label: "Disciplinas", value: data.totals.subjects, href: "/disciplinas" },
          { label: "Aulas", value: data.totals.lessons, href: "/aulas" },
          { label: "Transcrições", value: data.totals.transcriptions, href: "/aulas" },
        ].map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:border-royal-200 sm:p-5"
          >
            <dt className="text-xs font-medium text-slate-500 sm:text-sm">{stat.label}</dt>
            <dd className="mt-1 text-2xl font-semibold text-navy-900 sm:text-3xl">{formatNumber(stat.value)}</dd>
          </Link>
        ))}
      </dl>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Pendências" description="Aulas que aguardam conteúdo ou revisão." />
          {data.pending.length === 0 ? (
            <p className="text-sm text-slate-500">Nada pendente. Bom trabalho!</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.pending.map((lesson) => (
                <li key={lesson.id}>
                  <Link href={`/aulas/${lesson.id}`} className="flex items-center justify-between gap-3 py-3 hover:text-royal-700">
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-navy-900">{lesson.title}</span>
                      <span className="block truncate text-sm text-slate-500">{lesson.subjectName}</span>
                    </span>
                    <LessonStatusBadge status={lesson.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Últimas aulas"
            action={
              <Link href="/aulas" className="inline-flex items-center gap-1 text-sm font-medium text-royal-700 hover:text-royal-800">
                Ver todas <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            }
          />
          {data.recentLessons.length === 0 ? (
            <EmptyState
              icon={<ListVideo className="size-6" />}
              title="Nenhuma aula ainda"
              description="Crie uma aula ou importe uma transcrição pronta."
              action={<LinkButton href="/importar" size="sm">Importar transcrição</LinkButton>}
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.recentLessons.map((lesson) => (
                <li key={lesson.id}>
                  <Link href={`/aulas/${lesson.id}`} className="flex items-center justify-between gap-3 py-3 hover:text-royal-700">
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
          )}
        </Card>

        <Card>
          <CardHeader title="Transcrições recentes" description="Materiais textuais já salvos." />
          {data.recentTranscriptions.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhuma transcrição salva até agora.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.recentTranscriptions.map((t) => (
                <li key={t.lessonId}>
                  <Link href={`/aulas/${t.lessonId}`} className="flex items-start gap-3 py-3 hover:text-royal-700">
                    <FileText className="mt-0.5 size-5 shrink-0 text-royal-500" aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-navy-900">{t.lessonTitle}</span>
                      <span className="block text-sm text-slate-500">
                        {t.subjectName} · {plural(t.wordCount, "palavra", "palavras")}
                        {t.edited ? " · revisada" : ""}
                      </span>
                      <span className="block text-xs text-slate-400">
                        {TRANSCRIPTION_SOURCE_LABEL[t.source] ?? t.source} em {formatDateTime(t.createdAt, tz)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Disciplinas"
            action={
              <Link href="/disciplinas" className="inline-flex items-center gap-1 text-sm font-medium text-royal-700 hover:text-royal-800">
                Gerenciar <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            }
          />
          <ul className="flex flex-wrap gap-2">
            {data.subjects.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/disciplinas/${s.id}`}
                  className="inline-flex min-h-9 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 text-sm text-navy-900 hover:border-royal-200 hover:bg-royal-50"
                >
                  {s.name}
                  <span className="rounded-full bg-slate-100 px-1.5 text-xs text-slate-600">{s.lessonCount}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
