/**
 * Formatação de datas e números em português do Brasil.
 */

const DEFAULT_TZ = "America/Sao_Paulo";

/** Formata uma data "AAAA-MM-DD" sem conversão de fuso (é uma data de calendário). */
export function formatCalendarDate(isoDate: string | null | undefined): string {
  if (!isoDate) return "Sem data";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return isoDate;
  const [, y, m, d] = match;
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" })
    .format(date)
    .replace(/\./g, "");
}

/** Formata um instante (timestamptz) no fuso do aplicativo. */
export function formatDateTime(iso: string | null | undefined, timeZone: string = DEFAULT_TZ): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(date);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR").format(value);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value)} ${units[unit]}`;
}

/** Tempo estimado de leitura (≈ 200 palavras/minuto). */
export function readingMinutes(wordCount: number): number {
  return Math.max(1, Math.round(wordCount / 200));
}

/** Pluralização simples: plural(2, "aula", "aulas") → "2 aulas". */
export function plural(count: number, singular: string, pluralForm: string): string {
  return `${formatNumber(count)} ${count === 1 ? singular : pluralForm}`;
}
