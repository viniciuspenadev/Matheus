import "server-only";

import {
  MAX_TXT_BYTES,
  TranscriptTextError,
  assertTranscriptLength,
  decodeTextBytes,
  normalizeTranscript,
  type TextEncodingName,
} from "@/lib/text/transcript";

export interface TranscriptInput {
  text: string;
  source: "text_file" | "text_paste";
  filename: string | null;
  encoding: TextEncodingName | null;
}

function isLikelyTextFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return name.endsWith(".txt") || file.type.startsWith("text/plain") || file.type === "";
}

/**
 * Extrai e normaliza a transcrição enviada no formulário, seja por arquivo
 * .txt (campo "file") ou por texto colado (campo "text").
 */
export async function readTranscriptFromForm(formData: FormData, mode: "file" | "paste"): Promise<TranscriptInput> {
  if (mode === "file") {
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      throw new TranscriptTextError("Selecione um arquivo .txt com a transcrição.");
    }
    if (!isLikelyTextFile(file) || !file.name.toLowerCase().endsWith(".txt")) {
      throw new TranscriptTextError("Envie um arquivo de texto com extensão .txt.");
    }
    if (file.size > MAX_TXT_BYTES) {
      throw new TranscriptTextError("O arquivo excede o limite de 4 MB.");
    }
    const { text, encoding } = decodeTextBytes(new Uint8Array(await file.arrayBuffer()));
    const normalized = normalizeTranscript(text);
    assertTranscriptLength(normalized);
    return { text: normalized, source: "text_file", filename: file.name.slice(0, 255), encoding };
  }

  const raw = formData.get("text");
  const normalized = normalizeTranscript(typeof raw === "string" ? raw : "");
  assertTranscriptLength(normalized);
  return { text: normalized, source: "text_paste", filename: null, encoding: null };
}
