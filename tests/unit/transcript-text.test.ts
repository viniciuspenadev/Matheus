import { describe, expect, it } from "vitest";
import {
  MAX_TRANSCRIPT_CHARS,
  MAX_TXT_BYTES,
  TranscriptTextError,
  assertTranscriptLength,
  countWords,
  decodeTextBytes,
  normalizeTranscript,
} from "@/lib/text/transcript";
import { readTranscriptFromForm } from "@/server/transcript-input";

const utf8 = (s: string) => new TextEncoder().encode(s);

describe("decodificação de arquivos .txt", () => {
  it("lê UTF-8 sem BOM", () => {
    expect(decodeTextBytes(utf8("Glicólise e gliconeogênese"))).toEqual({
      text: "Glicólise e gliconeogênese",
      encoding: "utf-8",
    });
  });

  it("remove o BOM UTF-8", () => {
    const bytes = new Uint8Array([0xef, 0xbb, 0xbf, ...utf8("Mol")]);
    expect(decodeTextBytes(bytes)).toEqual({ text: "Mol", encoding: "utf-8" });
  });

  it("lê UTF-16 LE com BOM (exportação de alguns editores)", () => {
    const text = "Ácido";
    const bytes = new Uint8Array(2 + text.length * 2);
    bytes[0] = 0xff;
    bytes[1] = 0xfe;
    for (let i = 0; i < text.length; i++) {
      bytes[2 + i * 2] = text.charCodeAt(i) & 0xff;
      bytes[3 + i * 2] = text.charCodeAt(i) >> 8;
    }
    expect(decodeTextBytes(bytes)).toEqual({ text: "Ácido", encoding: "utf-16le" });
  });

  it("recorre a Windows-1252 quando o arquivo não é UTF-8 válido", () => {
    // "química" em Windows-1252: í = 0xED
    const bytes = new Uint8Array([0x71, 0x75, 0xed, 0x6d, 0x69, 0x63, 0x61]);
    expect(decodeTextBytes(bytes)).toEqual({ text: "química", encoding: "windows-1252" });
  });

  it("rejeita arquivo acima de 4 MB (limite seguro para a Vercel)", () => {
    expect(() => decodeTextBytes(new Uint8Array(MAX_TXT_BYTES + 1).fill(0x61))).toThrow(/4 MB/);
  });

  it("rejeita arquivo vazio e conteúdo binário", () => {
    expect(() => decodeTextBytes(new Uint8Array())).toThrow(TranscriptTextError);
    expect(() => decodeTextBytes(new Uint8Array([0x50, 0x4b, 0x00, 0x03]))).toThrow(/texto simples/);
  });
});

describe("normalização da transcrição", () => {
  it("padroniza quebras de linha e espaços sem alterar palavras", () => {
    const input = "﻿  Linha 1   \r\nLinha 2\r\r\n\n\n\nLinha\u0007 3\t \n";
    expect(normalizeTranscript(input)).toBe("Linha 1\nLinha 2\n\nLinha 3");
  });

  it("preserva acentos, fórmulas e pontuação", () => {
    const input = "C6H12O6 + 6 O2 → 6 CO2 + 6 H2O (ΔG < 0). Estequiometria: 1 mol = 6,022×10²³.";
    expect(normalizeTranscript(input)).toBe(input);
  });

  it("conta palavras", () => {
    expect(countWords("  a enzima\n\nhexoquinase  ")).toBe(3);
    expect(countWords("   ")).toBe(0);
  });

  it("valida limites de tamanho", () => {
    expect(() => assertTranscriptLength("")).toThrow(/vazia/);
    expect(() => assertTranscriptLength("a".repeat(MAX_TRANSCRIPT_CHARS + 1))).toThrow(/limite/);
    expect(() => assertTranscriptLength("ok")).not.toThrow();
  });
});

describe("leitura do formulário de importação", () => {
  it("modo arquivo: aceita .txt em Windows-1252 e normaliza", async () => {
    const fd = new FormData();
    const bytes = new Uint8Array([...utf8("Aula de qu"), 0xed, ...utf8("mica\r\n\r\n\r\nFim")]);
    fd.set("file", new File([bytes], "aula.TXT", { type: "text/plain" }));
    const result = await readTranscriptFromForm(fd, "file");
    expect(result).toEqual({
      text: "Aula de química\n\nFim",
      source: "text_file",
      filename: "aula.TXT",
      encoding: "windows-1252",
    });
  });

  it("modo arquivo: recusa ausência de arquivo e extensões diferentes de .txt", async () => {
    await expect(readTranscriptFromForm(new FormData(), "file")).rejects.toThrow(/Selecione um arquivo/);
    const fd = new FormData();
    fd.set("file", new File([utf8("conteúdo")], "aula.m4a", { type: "audio/mp4" }));
    await expect(readTranscriptFromForm(fd, "file")).rejects.toThrow(/\.txt/);
  });

  it("modo colar: normaliza e recusa texto vazio", async () => {
    const fd = new FormData();
    fd.set("text", "  O professor explicou a glicólise.  \r\n");
    await expect(readTranscriptFromForm(fd, "paste")).resolves.toEqual({
      text: "O professor explicou a glicólise.",
      source: "text_paste",
      filename: null,
      encoding: null,
    });
    const empty = new FormData();
    empty.set("text", " \n\t ");
    await expect(readTranscriptFromForm(empty, "paste")).rejects.toThrow(/vazia/);
  });
});
