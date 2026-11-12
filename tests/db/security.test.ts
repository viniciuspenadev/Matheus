/**
 * Segurança no banco: lista de e-mails autorizados, RLS e privilégios.
 * Cobre os testes obrigatórios 2 (bloqueio de usuário não autorizado — camada
 * de banco) e 18 (acesso indevido aos dados de outro usuário).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  asAnon,
  asService,
  asUser,
  attempt,
  createTestDb,
  createUser,
  expectPgError,
  type TestDb,
} from "./helpers";

let db: TestDb;
let alice: string;
let bob: string;
let aliceSubject: string;
let aliceLesson: string;

beforeAll(async () => {
  db = await createTestDb();
  alice = await createUser(db, "alice@example.com");
  bob = await createUser(db, "bob@example.com");

  aliceSubject = await asUser(
    db,
    alice,
    async (c) =>
      (await c.query<{ id: string }>(
        "insert into public.subjects (name, keywords) values ('Bioquímica', '{glicólise,enzimas}') returning id",
      )).rows[0]!.id,
    { commit: true },
  );
  aliceLesson = await asUser(
    db,
    alice,
    async (c) =>
      (await c.query<{ id: string }>(
        "select public.import_transcription($1, 'text_paste', null, $2, 'Aula 1 — Glicólise', null, null) as id",
        ["O professor explicou a glicólise.", aliceSubject],
      )).rows[0]!.id,
    { commit: true },
  );
});

afterAll(async () => {
  await db?.close();
});

describe("lista de e-mails autorizados", () => {
  it("rejeita a criação de conta com e-mail não autorizado", async () => {
    const msg = await expectPgError(
      db.admin.query("insert into auth.users (email) values ('intruso@example.com')"),
      ["42501"],
    );
    expect(msg).toContain("não autorizado");
  });

  it("rejeita conta sem e-mail (ex.: login anônimo ou por telefone)", async () => {
    await expectPgError(db.admin.query("insert into auth.users (email) values (null)"), ["42501"]);
  });

  it("aceita e-mail autorizado sem diferenciar maiúsculas e cria o perfil", async () => {
    await db.admin.query("insert into public.allowed_emails (email) values ('carol@example.com')");
    const { rows } = await db.admin.query<{ id: string }>(
      "insert into auth.users (email) values ('Carol@Example.com') returning id",
    );
    const profile = await db.admin.query("select auto_delete_audio from public.profiles where id = $1", [
      rows[0]!.id,
    ]);
    expect(profile.rows).toEqual([{ auto_delete_audio: true }]);
  });

  it("impede trocar o e-mail de uma conta para um endereço não autorizado", async () => {
    await expectPgError(
      db.admin.query("update auth.users set email = 'outro@example.com' where id = $1", [bob]),
      ["42501"],
    );
  });

  it("não permite que usuários autenticados leiam a lista", async () => {
    await asUser(db, alice, async (c) => {
      await expectPgError(attempt(c, "select * from public.allowed_emails"), ["42501"]);
    });
  });
});

describe("invariantes de RLS e privilégios", () => {
  it("todas as tabelas do schema public têm RLS habilitado", async () => {
    const { rows } = await db.admin.query<{ relname: string }>(`
      select c.relname from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
    `);
    expect(rows).toEqual([]);
  });

  it("o papel anon não tem nenhum privilégio em tabelas do schema public", async () => {
    const { rows } = await db.admin.query<{ relname: string }>(`
      select c.relname from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r'
        and (has_table_privilege('anon', c.oid, 'SELECT')
          or has_table_privilege('anon', c.oid, 'INSERT')
          or has_table_privilege('anon', c.oid, 'UPDATE')
          or has_table_privilege('anon', c.oid, 'DELETE'))
    `);
    expect(rows).toEqual([]);
  });

  it("o papel anon não executa nenhuma função do schema public", async () => {
    const { rows } = await db.admin.query<{ proname: string }>(`
      select p.proname from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'EXECUTE')
    `);
    expect(rows).toEqual([]);
  });

  it("usuários autenticados não executam funções internas da fila", async () => {
    await asUser(db, alice, async (c) => {
      await expectPgError(attempt(c, "select * from public.claim_next_job('w1')"), ["42501"]);
      await expectPgError(
        attempt(c, "select public.enqueue_job($1, $2, 'generate_materials')", [alice, aliceLesson]),
        ["42501"],
      );
    });
  });

  it("anon não lê dados", async () => {
    await asAnon(db, async (c) => {
      await expectPgError(attempt(c, "select * from public.lessons"), ["42501"]);
      await expectPgError(attempt(c, "select * from public.transcriptions"), ["42501"]);
    });
  });
});

describe("isolamento entre contas", () => {
  it("outro usuário não vê disciplinas, aulas ou transcrições alheias", async () => {
    await asUser(db, bob, async (c) => {
      for (const table of ["subjects", "lessons", "transcriptions", "profiles"]) {
        const { rows } = await c.query(`select * from public.${table} where ${table === "profiles" ? "id" : "user_id"} = $1`, [alice]);
        expect(rows, table).toEqual([]);
      }
    });
  });

  it("outro usuário não altera nem exclui dados alheios (0 linhas afetadas)", async () => {
    await asUser(db, bob, async (c) => {
      const upd = await c.query("update public.subjects set name = 'hackeado' where id = $1", [aliceSubject]);
      expect(upd.rowCount).toBe(0);
      const del = await c.query("delete from public.lessons where id = $1", [aliceLesson]);
      expect(del.rowCount).toBe(0);
      const tr = await c.query("update public.transcriptions set edited_text = 'x' where lesson_id = $1", [aliceLesson]);
      expect(tr.rowCount).toBe(0);
    });
    const still = await db.admin.query("select name from public.subjects where id = $1", [aliceSubject]);
    expect(still.rows[0]).toEqual({ name: "Bioquímica" });
  });

  it("não é possível criar registros em nome de outro usuário", async () => {
    await asUser(db, bob, async (c) => {
      await expectPgError(
        attempt(c, "insert into public.subjects (user_id, name) values ($1, 'X')", [alice]),
        ["42501"],
      );
    });
  });

  it("não é possível vincular uma aula própria à disciplina de outra conta", async () => {
    await asUser(db, bob, async (c) => {
      // A FK composta (subject_id, user_id) impede a referência cruzada.
      await expectPgError(
        attempt(c, "insert into public.lessons (subject_id, title) values ($1, 'Aula do Bob')", [aliceSubject]),
        ["23503"],
      );
    });
  });

  it("a RPC de importação não aceita aula ou disciplina de outra conta", async () => {
    await asUser(db, bob, async (c) => {
      const m1 = await expectPgError(
        attempt(c, "select public.import_transcription('texto', 'text_paste', $1)", [aliceLesson]),
        ["P0002"],
      );
      expect(m1).toContain("Aula não encontrada");
      const m2 = await expectPgError(
        attempt(c, "select public.import_transcription('texto', 'text_paste', null, $1, 'Título')", [aliceSubject]),
        ["P0002"],
      );
      expect(m2).toContain("Disciplina não encontrada");
    });
  });

  it("a RPC de nova tentativa não reabre tarefas de outra conta", async () => {
    const job = await asService(
      db,
      async (c) =>
        (await c.query<{ id: string }>(
          "select id from public.enqueue_job($1, $2, 'generate_materials')",
          [alice, aliceLesson],
        )).rows[0]!.id,
      { commit: true },
    );
    await db.admin.query("update public.processing_jobs set status = 'failed' where id = $1", [job]);
    await asUser(db, bob, async (c) => {
      await expectPgError(attempt(c, "select public.request_job_retry($1)", [job]), ["P0002"]);
    });
    await asUser(db, alice, async (c) => {
      const { rows } = await c.query<{ status: string }>("select status from public.request_job_retry($1)", [job]);
      expect(rows[0]!.status).toBe("queued");
    });
  });
});

describe("privilégios por coluna", () => {
  it("o usuário não altera o status da aula diretamente", async () => {
    await asUser(db, alice, async (c) => {
      await expectPgError(
        attempt(c, "update public.lessons set status = 'ready' where id = $1", [aliceLesson]),
        ["42501"],
      );
    });
  });

  it("o usuário não insere transcrições diretamente (somente via RPC)", async () => {
    await asUser(db, alice, async (c) => {
      await expectPgError(
        attempt(
          c,
          `insert into public.transcriptions (user_id, lesson_id, source, original_text, word_count, char_count, content_sha256)
           values ($1, $2, 'text_paste', 'x', 1, 1, repeat('a', 64))`,
          [alice, aliceLesson],
        ),
        ["42501"],
      );
    });
  });

  it("o usuário não altera a transcrição original", async () => {
    await asUser(db, alice, async (c) => {
      await expectPgError(
        attempt(c, "update public.transcriptions set original_text = 'alterado' where lesson_id = $1", [aliceLesson]),
        ["42501"],
      );
    });
  });

  it("nem o service role altera a transcrição original (gatilho de imutabilidade)", async () => {
    await asService(db, async (c) => {
      const msg = await expectPgError(
        attempt(c, "update public.transcriptions set original_text = 'alterado' where lesson_id = $1", [aliceLesson]),
        ["42501"],
      );
      expect(msg).toContain("imutável");
    });
  });
});
