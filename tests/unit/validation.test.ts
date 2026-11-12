import { describe, expect, it } from "vitest";
import {
  importNewLessonSchema,
  lessonSchema,
  loginSchema,
  parseKeywords,
  subjectSchema,
  transcriptEditSchema,
} from "@/lib/validation/schemas";
import { describeDbError } from "@/server/errors";

const UUID = "3f2b8c1e-4a5d-4e6f-9a7b-1c2d3e4f5a6b";

describe("vocabulário da disciplina", () => {
  it("separa por vírgula, ponto e vírgula e linha; remove duplicados sem diferenciar maiúsculas", () => {
    expect(parseKeywords("Enzimas, glicólise;Gliconeogênese\nenzimas\n  DNA  ,, RNA , mol ")).toEqual([
      "Enzimas",
      "glicólise",
      "Gliconeogênese",
      "DNA",
      "RNA",
      "mol",
    ]);
  });
});

describe("disciplina", () => {
  it("converte campos opcionais vazios em null", () => {
    const r = subjectSchema.parse({ name: "  Bioquímica  ", code: "", professor: " ", courseId: "", keywords: "" });
    expect(r).toEqual({ name: "Bioquímica", code: null, professor: null, description: null, courseId: null, keywords: [] });
  });

  it("exige nome e valida o curso", () => {
    const r = subjectSchema.safeParse({ name: " ", courseId: "nao-e-uuid" });
    expect(r.success).toBe(false);
    if (!r.success) {
      const fields = r.error.issues.map((i) => i.path[0]);
      expect(fields).toContain("name");
      expect(fields).toContain("courseId");
    }
  });

  it("limita o tamanho dos termos do vocabulário", () => {
    expect(subjectSchema.safeParse({ name: "X", keywords: "a".repeat(81) }).success).toBe(false);
  });
});

describe("aula", () => {
  it("aceita data AAAA-MM-DD e vazio", () => {
    expect(lessonSchema.parse({ subjectId: UUID, title: "Aula 1", lessonDate: "2026-11-10" }).lessonDate).toBe("2026-11-10");
    expect(lessonSchema.parse({ subjectId: UUID, title: "Aula 1", lessonDate: "" }).lessonDate).toBeNull();
  });

  it("recusa data inválida, título vazio e disciplina ausente", () => {
    expect(lessonSchema.safeParse({ subjectId: UUID, title: "Aula", lessonDate: "2026-02-30" }).success).toBe(false);
    expect(lessonSchema.safeParse({ subjectId: UUID, title: "Aula", lessonDate: "1900-01-01" }).success).toBe(false);
    expect(lessonSchema.safeParse({ subjectId: UUID, title: "   " }).success).toBe(false);
    expect(lessonSchema.safeParse({ subjectId: "", title: "Aula" }).success).toBe(false);
  });

  it("importação exige modo válido", () => {
    expect(importNewLessonSchema.safeParse({ subjectId: UUID, title: "A", mode: "audio" }).success).toBe(false);
    expect(importNewLessonSchema.safeParse({ subjectId: UUID, title: "A", mode: "paste" }).success).toBe(true);
  });

  it("edição da transcrição não pode ficar vazia", () => {
    expect(transcriptEditSchema.safeParse({ lessonId: UUID, text: " \n " }).success).toBe(false);
  });
});

describe("login", () => {
  it("normaliza o e-mail", () => {
    expect(loginSchema.parse({ email: "  Aluno@Exemplo.COM ", password: "x" }).email).toBe("aluno@exemplo.com");
  });
});

describe("mensagens de erro do banco", () => {
  it("usa mensagens específicas, das RPCs próprias e de conexão", () => {
    expect(describeDbError({ code: "23505", message: "duplicate key" }, { "23505": "Nome duplicado." })).toBe("Nome duplicado.");
    expect(describeDbError({ code: "P0002", message: "Aula não encontrada." }, {}, true)).toBe("Aula não encontrada.");
    expect(describeDbError({ code: "P0002", message: "internal detail" })).toMatch(/Não foi possível/);
    expect(describeDbError({ message: "TypeError: fetch failed" })).toMatch(/conectar/);
    expect(describeDbError({ code: "42501", message: "permission denied for table lessons" })).toMatch(/permissão/);
  });
});
