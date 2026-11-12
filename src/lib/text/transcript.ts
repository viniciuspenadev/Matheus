/**
 * Leitura e normalização de transcrições em texto (.txt ou texto colado).
 *
 * A normalização altera apenas espaços em branco e caracteres de controle —
 * nunca palavras — para preservar fielmente o conteúdo da aula.
 */

/** Limite de caracteres aceito pelo banco (≈ 10× uma aula de 4 horas). */
export const MAX_TRANSCRIPT_CHARS = 3_000_000;
/**
 * Tamanho máximo do .txt (e do texto colado, em bytes UTF-8). Mantido abaixo do
 * limite de 4,5 MB por requisição das funções da Vercel.
 */
export const MAX_TXT_BYTES = 4 * 1024 * 1024;

export type TextEncodingName = "utf-8" | "utf-16le" | "utf-16be" | "windows-1252";

export class TranscriptTextError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TranscriptTextError";
  }
}

/**
 * Decodifica os bytes de um arquivo de texto detectando a codificação:
 * BOM UTF-8/UTF-16, UTF-8 válido ou, como alternativa, Windows-1252
 * (comum em arquivos salvos pelo Bloco de Notas antigo).
 */
export function decodeTextBytes(bytes: Uint8Array): { text: string; encoding: TextEncodingName } {
  if (bytes.length === 0) {
    throw new TranscriptTextError("O arquivo está vazio.");
  }
  if (bytes.length > MAX_TXT_BYTES) {
    throw new TranscriptTextError("O arquivo excede o limite de 4 MB.");
  }

  let encoding: TextEncodingName;
  let text: string;

  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    encoding = "utf-8";
    text = new TextDecoder("utf-8").decode(bytes.subarray(3));
  } else if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    encoding = "utf-16le";
    text = new TextDecoder("utf-16le").decode(bytes.subarray(2));
  } else if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    encoding = "utf-16be";
    text = new TextDecoder("utf-16be").decode(bytes.subarray(2));
  } else {
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      encoding = "utf-8";
    } catch {
      text = new TextDecoder("windows-1252").decode(bytes);
      encoding = "windows-1252";
    }
  }

  if (text.includes("\u0000")) {
    throw new TranscriptTextError("O arquivo não parece ser um texto simples (.txt).");
  }

  return { text, encoding };
}

/**
 * Normaliza quebras de linha e espaços:
 * - remove BOM e caracteres de controle (exceto tabulação e quebra de linha);
 * - converte CRLF/CR em LF;
 * - remove espaços no fim de cada linha;
 * - limita sequências de linhas em branco a uma linha vazia;
 * - remove espaços no início e no fim do texto.
 */
export function normalizeTranscript(input: string): string {
  return input
    .replace(/﻿/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[ \t ]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Conta palavras com a mesma regra usada no banco (separação por espaços). */
export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed.length === 0 ? 0 : trimmed.split(/\s+/).length;
}

export function assertTranscriptLength(text: string): void {
  if (text.length === 0) {
    throw new TranscriptTextError("A transcrição está vazia.");
  }
  if (text.length > MAX_TRANSCRIPT_CHARS) {
    throw new TranscriptTextError(
      `A transcrição tem ${text.length.toLocaleString("pt-BR")} caracteres; o limite é ${MAX_TRANSCRIPT_CHARS.toLocaleString("pt-BR")}.`,
    );
  }
}
