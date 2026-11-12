import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { importNewLessonAction } from "@/app/(app)/aulas/actions";
import { TranscriptImportForm } from "@/components/forms/transcript-import-form";
import { PageHeader } from "@/components/page-header";
import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { isUuid } from "@/server/action-utils";
import { listSubjects } from "@/server/subjects";

export const metadata: Metadata = { title: "Importar transcrição" };

export default async function ImportPage({ searchParams }: PageProps<"/importar">) {
  const params = await searchParams;
  const preselected = typeof params.disciplina === "string" && isUuid(params.disciplina) ? params.disciplina : undefined;
  const subjects = await listSubjects();

  return (
    <>
      <PageHeader
        title="Importar transcrição"
        description="Já tem a transcrição da aula? Envie o arquivo .txt ou cole o texto para criar a aula com o conteúdo."
      />
      {subjects.length === 0 ? (
        <EmptyState
          title="Cadastre uma disciplina primeiro"
          description="A transcrição será associada a uma aula dentro de uma disciplina."
          action={<LinkButton href="/disciplinas/nova">Cadastrar disciplina</LinkButton>}
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <Card>
            <TranscriptImportForm
              action={importNewLessonAction}
              variant={{
                kind: "new",
                subjects: subjects.map((s) => ({ id: s.id, name: s.name })),
                defaultSubjectId: subjects.some((s) => s.id === preselected) ? preselected : undefined,
              }}
            />
          </Card>
          <aside className="space-y-3 text-sm text-slate-600">
            <div className="flex items-start gap-2 rounded-2xl border border-slate-200 bg-white p-4">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-royal-600" aria-hidden="true" />
              <p>
                O texto original é preservado exatamente como enviado (apenas espaços e quebras de linha são
                padronizados). Você poderá revisar uma cópia editável sem perder o original.
              </p>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
