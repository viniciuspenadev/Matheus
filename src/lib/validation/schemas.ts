import { z } from "zod";
import { MAX_TRANSCRIPT_CHARS } from "@/lib/text/transcript";
import { optionalIsoDate, optionalText, optionalUuid, requiredUuid } from "./common";

export const MAX_KEYWORDS = 200;
export const MAX_KEYWORD_LENGTH = 80;

/**
 * Vocabulário da disciplina: aceita termos separados por vírgula, ponto e
 * vírgula ou quebra de linha. Remove duplicados (sem diferenciar maiúsculas).
 */
export function parseKeywords(raw: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const piece of raw.split(/[,;\n\r]+/)) {
    const term = piece.trim().replace(/\s+/g, " ");
    if (!term) continue;
    const key = term.toLocaleLowerCase("pt-BR");
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(term);
  }
  return result;
}

const keywordsField = z
  .string()
  .optional()
  .transform((v) => parseKeywords(v ?? ""))
  .refine((list) => list.length <= MAX_KEYWORDS, `Use no máximo ${MAX_KEYWORDS} termos.`)
  .refine(
    (list) => list.every((t) => t.length <= MAX_KEYWORD_LENGTH),
    `Cada termo deve ter no máximo ${MAX_KEYWORD_LENGTH} caracteres.`,
  );

export const subjectSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome da disciplina.").max(160, "Nome muito longo (máx. 160)."),
  code: optionalText(40, "O código"),
  professor: optionalText(160, "O nome do professor"),
  description: optionalText(2000, "A descrição"),
  courseId: optionalUuid,
  keywords: keywordsField,
});
export type SubjectInput = z.output<typeof subjectSchema>;

export const courseSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome do curso.").max(160, "Nome muito longo (máx. 160)."),
  institution: optionalText(160, "A instituição"),
});
export type CourseInput = z.output<typeof courseSchema>;

export const lessonSchema = z.object({
  subjectId: requiredUuid("Selecione a disciplina."),
  title: z.string().trim().min(1, "Informe o título da aula.").max(200, "Título muito longo (máx. 200)."),
  lessonDate: optionalIsoDate,
  notes: optionalText(4000, "As observações"),
});
export type LessonInput = z.output<typeof lessonSchema>;

/** Dados do formulário "Importar transcrição" (o texto é validado à parte). */
export const importNewLessonSchema = z.object({
  subjectId: requiredUuid("Selecione a disciplina."),
  title: z.string().trim().min(1, "Informe o título da aula.").max(200, "Título muito longo (máx. 200)."),
  lessonDate: optionalIsoDate,
  mode: z.enum(["file", "paste"], "Escolha enviar um arquivo ou colar o texto."),
});

export const importExistingLessonSchema = z.object({
  lessonId: requiredUuid("Aula inválida."),
  mode: z.enum(["file", "paste"], "Escolha enviar um arquivo ou colar o texto."),
});

export const transcriptEditSchema = z.object({
  lessonId: requiredUuid("Aula inválida."),
  text: z
    .string()
    .max(MAX_TRANSCRIPT_CHARS, "A transcrição excede o limite de caracteres.")
    .refine((v) => v.trim().length > 0, "A transcrição editada não pode ficar vazia."),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Informe um e-mail válido.").max(254)),
  password: z.string().min(1, "Informe a senha.").max(200),
  next: z.string().max(500).optional(),
});
