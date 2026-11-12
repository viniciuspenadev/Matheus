/**
 * Regras de dados da Etapa 1: disciplinas, cursos, aulas, importação de
 * transcrição (teste obrigatório 4 — camada de banco) e edição da transcrição.
 */
import { createHash } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asUser, attempt, createTestDb, createUser, expectPgError, type TestDb } from "./helpers";

let db: TestDb;
let user: string;

beforeAll(async () => {
  db = await createTestDb();
  user = await createUser(db, "estudante@example.com");
});

afterAll(async () => {
  await db?.close();
});

async function newSubject(name: string, extra: { courseId?: string } = {}): Promise<string> {
  return asUser(
    db,
    user,
    async (c) =>
      (await c.query<{ id: string }>(
        "insert into public.subjects (name, course_id) values ($1, $2) returning id",
        [name, extra.courseId ?? null],
      )).rows[0]!.id,
    { commit: true },
  );
}

describe("disciplinas e cursos", () => {
  it("cria e edita disciplina com vocabulário", async () => {
    const id = await newSubject("Química Orgânica");
    await asUser(
      db,
      user,
      async (c) => {
        await c.query(
          "update public.subjects set professor = 'Profa. Ana', keywords = '{estequiometria,mol}' where id = $1",
          [id],
        );
      },
      { commit: true },
    );
    const { rows } = await db.admin.query("select professor, keywords, user_id from public.subjects where id = $1", [id]);
    expect(rows[0]).toEqual({ professor: "Profa. Ana", keywords: ["estequiometria", "mol"], user_id: user });
  });

  it("não permite nomes duplicados (sem diferenciar maiúsculas)", async () => {
    await newSubject("Biologia Celular");
    await asUser(db, user, async (c) => {
      await expectPgError(attempt(c, "insert into public.subjects (name) values ('biologia celular')"), ["23505"]);
    });
  });

  it("bloqueia excluir disciplina que possui aulas e permite quando vazia", async () => {
    const withLesson = await newSubject("Genética");
    const empty = await newSubject("Microbiologia");
    await asUser(
      db,
      user,
      async (c) => {
        await c.query("insert into public.lessons (subject_id, title) values ($1, 'Aula 1')", [withLesson]);
      },
      { commit: true },
    );
    await asUser(db, user, async (c) => {
      await expectPgError(attempt(c, "delete from public.subjects where id = $1", [withLesson]), ["23503"]);
      const del = await c.query("delete from public.subjects where id = $1", [empty]);
      expect(del.rowCount).toBe(1);
    });
  });

  it("excluir um curso desvincula as disciplinas sem apagá-las", async () => {
    const courseId = await asUser(
      db,
      user,
      async (c) =>
        (await c.query<{ id: string }>("insert into public.courses (name) values ('Biotecnologia') returning id")).rows[0]!.id,
      { commit: true },
    );
    const subjectId = await newSubject("Bioprocessos", { courseId });
    await asUser(db, user, async (c) => {
      await c.query("delete from public.courses where id = $1", [courseId]);
      const { rows } = await c.query("select course_id, user_id from public.subjects where id = $1", [subjectId]);
      expect(rows[0]).toEqual({ course_id: null, user_id: user });
    });
  });
});

describe("importação de transcrição (RPC import_transcription)", () => {
  it("cria aula e transcrição de forma atômica com contagens e hash", async () => {
    const subjectId = await newSubject("Bioquímica I");
    const text = "Hoje vamos estudar a glicólise.\n\nA enzima hexoquinase fosforila a glicose.";
    const lessonId = await asUser(
      db,
      user,
      async (c) =>
        (await c.query<{ id: string }>(
          "select public.import_transcription($1, 'text_file', null, $2, '  Aula 3  ', '2026-11-10', 'aula3.txt') as id",
          [`  ${text}\n`, subjectId],
        )).rows[0]!.id,
      { commit: true },
    );

    const lesson = await db.admin.query(
      "select title, status, source_type, lesson_date::text as date from public.lessons where id = $1",
      [lessonId],
    );
    expect(lesson.rows[0]).toEqual({ title: "Aula 3", status: "transcribed", source_type: "text", date: "2026-11-10" });

    const tr = await db.admin.query(
      "select original_text, edited_text, source, source_filename, word_count, char_count, content_sha256, integrity_status from public.transcriptions where lesson_id = $1",
      [lessonId],
    );
    expect(tr.rows[0]).toEqual({
      original_text: text,
      edited_text: null,
      source: "text_file",
      source_filename: "aula3.txt",
      word_count: 11,
      char_count: text.length,
      content_sha256: createHash("sha256").update(text, "utf8").digest("hex"),
      integrity_status: "not_applicable",
    });
  });

  it("importa para uma aula existente em rascunho e recusa segunda importação", async () => {
    const subjectId = await newSubject("Fisiologia");
    const lessonId = await asUser(
      db,
      user,
      async (c) =>
        (await c.query<{ id: string }>(
          "insert into public.lessons (subject_id, title) values ($1, 'Aula rascunho') returning id",
          [subjectId],
        )).rows[0]!.id,
      { commit: true },
    );
    await asUser(
      db,
      user,
      async (c) => {
        await c.query("select public.import_transcription('Primeira versão.', 'text_paste', $1)", [lessonId]);
      },
      { commit: true },
    );
    await asUser(db, user, async (c) => {
      const msg = await expectPgError(
        attempt(c, "select public.import_transcription('Outra versão.', 'text_paste', $1)", [lessonId]),
        ["23505"],
      );
      expect(msg).toContain("já possui");
    });
  });

  it("recusa texto vazio, origem inválida e dados obrigatórios ausentes", async () => {
    const subjectId = await newSubject("Imunologia");
    await asUser(db, user, async (c) => {
      await expectPgError(
        attempt(c, "select public.import_transcription(E'  \\n\\t ', 'text_paste', null, $1, 'T')", [subjectId]),
        ["22023"],
      );
      await expectPgError(
        attempt(c, "select public.import_transcription('ok', 'audio', null, $1, 'T')", [subjectId]),
        ["22023"],
      );
      await expectPgError(attempt(c, "select public.import_transcription('ok', 'text_paste')"), ["22023"]);
    });
  });

  it("não deixa aula órfã quando a importação falha", async () => {
    const subjectId = await newSubject("Farmacologia");
    await asUser(db, user, async (c) => {
      await expectPgError(
        attempt(c, "select public.import_transcription($1, 'text_paste', null, $2, 'Grande demais')", [
          "a".repeat(3_000_001),
          subjectId,
        ]),
        ["22001"],
      );
    });
    const { rows } = await db.admin.query("select count(*)::int as n from public.lessons where subject_id = $1", [subjectId]);
    expect(rows[0]).toEqual({ n: 0 });
  });
});

describe("edição da transcrição", () => {
  it("salva versão editada, registra data e permite restaurar o original", async () => {
    const subjectId = await newSubject("Bioquímica II");
    const lessonId = await asUser(
      db,
      user,
      async (c) =>
        (await c.query<{ id: string }>(
          "select public.import_transcription('Texto origina.', 'text_paste', null, $1, 'Aula') as id",
          [subjectId],
        )).rows[0]!.id,
      { commit: true },
    );

    await asUser(db, user, async (c) => {
      const upd = await c.query<{ edited_text: string; edited_at: Date | null; original_text: string }>(
        "update public.transcriptions set edited_text = 'Texto original.' where lesson_id = $1 returning edited_text, edited_at, original_text",
        [lessonId],
      );
      expect(upd.rows[0]!.edited_text).toBe("Texto original.");
      expect(upd.rows[0]!.edited_at).toBeInstanceOf(Date);
      expect(upd.rows[0]!.original_text).toBe("Texto origina.");

      const same = await c.query<{ edited_text: string | null; edited_at: Date | null }>(
        "update public.transcriptions set edited_text = original_text where lesson_id = $1 returning edited_text, edited_at",
        [lessonId],
      );
      expect(same.rows[0]).toEqual({ edited_text: null, edited_at: null });
    });
  });
});
