/** Status possíveis de uma aula (espelha o CHECK da tabela public.lessons). */
export const LESSON_STATUSES = [
  "draft",
  "uploading",
  "queued",
  "processing_audio",
  "transcribing",
  "transcribed",
  "generating_materials",
  "researching",
  "ready",
  "needs_review",
  "error",
] as const;

export type LessonStatus = (typeof LESSON_STATUSES)[number];

export type StatusTone = "neutral" | "info" | "progress" | "success" | "warning" | "danger";

export const LESSON_STATUS_META: Record<LessonStatus, { label: string; tone: StatusTone; description: string }> = {
  draft: { label: "Sem conteúdo", tone: "neutral", description: "Aula criada; envie um áudio ou importe a transcrição." },
  uploading: { label: "Enviando áudio", tone: "progress", description: "O arquivo de áudio está sendo enviado." },
  queued: { label: "Na fila", tone: "info", description: "Aguardando o processamento em segundo plano." },
  processing_audio: { label: "Preparando áudio", tone: "progress", description: "O áudio está sendo preparado e segmentado." },
  transcribing: { label: "Transcrevendo", tone: "progress", description: "Os trechos do áudio estão sendo transcritos." },
  transcribed: { label: "Transcrita", tone: "success", description: "A transcrição está disponível." },
  generating_materials: { label: "Gerando materiais", tone: "progress", description: "Apostila, resumo e exercícios em produção." },
  researching: { label: "Pesquisando fontes", tone: "progress", description: "Buscando referências científicas." },
  ready: { label: "Concluída", tone: "success", description: "Todos os materiais estão disponíveis." },
  needs_review: { label: "Requer revisão", tone: "warning", description: "Há itens aguardando sua confirmação." },
  error: { label: "Erro", tone: "danger", description: "O processamento falhou. Veja os detalhes." },
};

export function lessonStatusMeta(status: string) {
  return LESSON_STATUS_META[status as LessonStatus] ?? {
    label: status,
    tone: "neutral" as const,
    description: "",
  };
}

export const TRANSCRIPTION_SOURCE_LABEL: Record<string, string> = {
  audio: "Transcrição de áudio",
  text_file: "Arquivo de texto importado",
  text_paste: "Texto colado",
};
