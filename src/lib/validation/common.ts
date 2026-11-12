import { z } from "zod";

/** Texto opcional: string vazia vira null; aplica trim e limite de tamanho. */
export function optionalText(max: number, label: string) {
  return z
    .string()
    .trim()
    .max(max, `${label} deve ter no máximo ${max} caracteres.`)
    .transform((v) => (v.length === 0 ? null : v))
    .nullable()
    .optional()
    .transform((v) => v ?? null);
}

/** UUID opcional vindo de <select>: "" vira null. */
export const optionalUuid = z
  .union([z.literal(""), z.uuid("Seleção inválida.")])
  .nullable()
  .optional()
  .transform((v) => (v ? v : null));

export const requiredUuid = (message: string) => z.uuid(message);

/** Data no formato AAAA-MM-DD (input type="date"); vazio vira null. */
export const optionalIsoDate = z
  .union([z.literal(""), z.iso.date("Data inválida.")])
  .nullable()
  .optional()
  .transform((v) => (v ? v : null))
  .refine((v) => {
    if (!v) return true;
    const year = Number(v.slice(0, 4));
    return year >= 1990 && year <= 2100;
  }, "Data fora do intervalo permitido.");

/** Converte FormData em objeto simples, ignorando campos de arquivo. */
export function formDataToRecord(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && !key.startsWith("$ACTION")) out[key] = value;
  }
  return out;
}

export type FieldErrors = Record<string, string[] | undefined>;

export function fieldErrorsOf(error: z.ZodError): FieldErrors {
  return z.flattenError(error).fieldErrors as FieldErrors;
}
