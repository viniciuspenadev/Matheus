/**
 * Fila persistente de tarefas (base da Etapa 2): deduplicação, reserva
 * concorrente, novas tentativas com espera e retomada de tarefas interrompidas.
 */
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asUser, createTestDb, createUser, type TestDb } from "./helpers";

let db: TestDb;
let user: string;
let lessonA: string;
let lessonB: string;

interface JobRow {
  id: string;
  status: string;
  attempts: number;
  locked_by: string | null;
  run_after: Date;
  last_error: string | null;
}

beforeAll(async () => {
  db = await createTestDb();
  user = await createUser(db, "fila@example.com");
  const subjectId = await asUser(
    db,
    user,
    async (c) => (await c.query<{ id: string }>("insert into public.subjects (name) values ('Química') returning id")).rows[0]!.id,
    { commit: true },
  );
  const mk = (title: string) =>
    asUser(
      db,
      user,
      async (c) =>
        (await c.query<{ id: string }>("insert into public.lessons (subject_id, title) values ($1, $2) returning id", [
          subjectId,
          title,
        ])).rows[0]!.id,
      { commit: true },
    );
  lessonA = await mk("Aula A");
  lessonB = await mk("Aula B");
});

afterAll(async () => {
  await db?.close();
});

async function enqueue(lessonId: string, type = "transcribe_audio", maxAttempts = 3): Promise<JobRow> {
  const { rows } = await db.admin.query<JobRow>(
    "select * from public.enqueue_job($1, $2, $3, '{}'::jsonb, 100::smallint, $4)",
    [user, lessonId, type, maxAttempts],
  );
  return rows[0]!;
}

async function claim(worker: string, client: Client = db.admin): Promise<JobRow | undefined> {
  const { rows } = await client.query<JobRow>("select * from public.claim_next_job($1)", [worker]);
  return rows[0];
}

async function resetJobs() {
  await db.admin.query("delete from public.processing_jobs");
}

describe("fila de tarefas", () => {
  it("não duplica tarefa ativa do mesmo tipo para a mesma aula", async () => {
    await resetJobs();
    const first = await enqueue(lessonA);
    const second = await enqueue(lessonA);
    expect(second.id).toBe(first.id);
    const other = await enqueue(lessonA, "generate_materials");
    expect(other.id).not.toBe(first.id);
  });

  it("dois workers concorrentes nunca reservam a mesma tarefa", async () => {
    await resetJobs();
    await enqueue(lessonA);
    await enqueue(lessonB);

    const c1 = new Client({ connectionString: db.url });
    const c2 = new Client({ connectionString: db.url });
    await c1.connect();
    await c2.connect();
    try {
      await c1.query("begin");
      const j1 = await claim("worker-1", c1); // mantém o lock da linha até o commit
      const j2 = await claim("worker-2", c2); // SKIP LOCKED pula a linha reservada
      await c1.query("commit");
      expect(j1).toBeDefined();
      expect(j2).toBeDefined();
      expect(j1!.id).not.toBe(j2!.id);
      expect(await claim("worker-3")).toBeUndefined();
    } finally {
      await c1.end();
      await c2.end();
    }
  });

  it("reagenda com espera exponencial e marca falha ao esgotar tentativas", async () => {
    await resetJobs();
    const job = await enqueue(lessonA, "transcribe_audio", 2);

    const run1 = await claim("w");
    expect(run1).toMatchObject({ id: job.id, status: "running", attempts: 1, locked_by: "w" });
    const failed1 = (await db.admin.query<JobRow>("select * from public.fail_job($1, 'w', 'erro temporário')", [job.id])).rows[0]!;
    expect(failed1.status).toBe("queued");
    expect(failed1.run_after.getTime()).toBeGreaterThan(Date.now() + 20_000);
    expect(await claim("w")).toBeUndefined(); // ainda aguardando a espera

    await db.admin.query("update public.processing_jobs set run_after = now() where id = $1", [job.id]);
    const run2 = await claim("w");
    expect(run2?.attempts).toBe(2);
    const failed2 = (await db.admin.query<JobRow>("select * from public.fail_job($1, 'w', 'erro de novo')", [job.id])).rows[0]!;
    expect(failed2).toMatchObject({ status: "failed", last_error: "erro de novo" });
  });

  it("falha definitiva sem nova tentativa quando p_retry = false", async () => {
    await resetJobs();
    const job = await enqueue(lessonA, "transcribe_audio", 5);
    await claim("w");
    const res = (await db.admin.query<JobRow>("select * from public.fail_job($1, 'w', 'arquivo inválido', false)", [job.id])).rows[0]!;
    expect(res.status).toBe("failed");
  });

  it("retoma tarefa interrompida quando o worker para de enviar sinais", async () => {
    await resetJobs();
    const job = await enqueue(lessonA);
    await claim("worker-que-caiu");
    await db.admin.query(
      "update public.processing_jobs set heartbeat_at = now() - interval '20 minutes' where id = $1",
      [job.id],
    );
    const resumed = await claim("worker-novo");
    expect(resumed).toMatchObject({ id: job.id, status: "running", attempts: 2, locked_by: "worker-novo" });
  });

  it("somente o worker dono da reserva conclui ou envia progresso", async () => {
    await resetJobs();
    const job = await enqueue(lessonA);
    await claim("dono");
    const hbOther = await db.admin.query<{ ok: boolean }>("select public.heartbeat_job($1, 'intruso', '{}') as ok", [job.id]);
    expect(hbOther.rows[0]!.ok).toBe(false);
    const doneOther = await db.admin.query<{ ok: boolean }>("select public.complete_job($1, 'intruso') as ok", [job.id]);
    expect(doneOther.rows[0]!.ok).toBe(false);

    const hb = await db.admin.query<{ ok: boolean }>(
      "select public.heartbeat_job($1, 'dono', '{\"step\":\"transcribing\",\"current\":3,\"total\":24}') as ok",
      [job.id],
    );
    expect(hb.rows[0]!.ok).toBe(true);
    const done = await db.admin.query<{ ok: boolean }>("select public.complete_job($1, 'dono', '{\"segments\":24}') as ok", [job.id]);
    expect(done.rows[0]!.ok).toBe(true);
    const { rows } = await db.admin.query("select status, progress, result from public.processing_jobs where id = $1", [job.id]);
    expect(rows[0]).toEqual({
      status: "succeeded",
      progress: { step: "transcribing", current: 3, total: 24 },
      result: { segments: 24 },
    });
  });

  it("após concluir, é possível enfileirar o mesmo tipo novamente", async () => {
    await resetJobs();
    const job = await enqueue(lessonB);
    await claim("w");
    await db.admin.query("select public.complete_job($1, 'w')", [job.id]);
    const again = await enqueue(lessonB);
    expect(again.id).not.toBe(job.id);
  });
});
