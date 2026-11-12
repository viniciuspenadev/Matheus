import { BookMarked, GraduationCap, Plus, User } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { plural } from "@/lib/format";
import { listSubjects } from "@/server/subjects";

export const metadata: Metadata = { title: "Disciplinas" };

export default async function SubjectsPage() {
  const subjects = await listSubjects();

  return (
    <>
      <PageHeader
        title="Disciplinas"
        description="Organize aulas e materiais por disciplina."
        actions={
          <>
            <LinkButton href="/disciplinas/nova">
              <Plus className="size-4" aria-hidden="true" /> Nova disciplina
            </LinkButton>
            <LinkButton href="/disciplinas/cursos" variant="secondary">
              <GraduationCap className="size-4" aria-hidden="true" /> Cursos
            </LinkButton>
          </>
        }
      />

      {subjects.length === 0 ? (
        <EmptyState
          icon={<BookMarked className="size-6" />}
          title="Nenhuma disciplina cadastrada"
          description="Cadastre disciplinas como Bioquímica, Química Orgânica ou Biologia Celular."
          action={<LinkButton href="/disciplinas/nova">Cadastrar disciplina</LinkButton>}
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {subjects.map((s) => (
            <li key={s.id}>
              <Link
                href={`/disciplinas/${s.id}`}
                className="block h-full rounded-2xl border border-slate-200 bg-white p-5 transition-colors hover:border-royal-200 hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-semibold text-navy-900">{s.name}</h2>
                  {s.code ? <Badge tone="info">{s.code}</Badge> : null}
                </div>
                <div className="mt-2 space-y-1 text-sm text-slate-500">
                  {s.professor ? (
                    <p className="flex items-center gap-1.5">
                      <User className="size-4" aria-hidden="true" /> {s.professor}
                    </p>
                  ) : null}
                  {s.courseName ? (
                    <p className="flex items-center gap-1.5">
                      <GraduationCap className="size-4" aria-hidden="true" /> {s.courseName}
                    </p>
                  ) : null}
                  <p>
                    {plural(s.lessonCount, "aula", "aulas")} · {plural(s.keywords.length, "termo", "termos")} no vocabulário
                  </p>
                </div>
                {s.keywords.length > 0 ? (
                  <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Vocabulário">
                    {s.keywords.slice(0, 6).map((k) => (
                      <li key={k} className="rounded-full bg-royal-50 px-2 py-0.5 text-xs text-royal-700">
                        {k}
                      </li>
                    ))}
                    {s.keywords.length > 6 ? (
                      <li className="px-1 text-xs text-slate-500">+{s.keywords.length - 6}</li>
                    ) : null}
                  </ul>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
