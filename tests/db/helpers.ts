import { randomUUID } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client, type QueryResult, type QueryResultRow } from "pg";

const root = fileURLToPath(new URL("../..", import.meta.url));
const migrationsDir = path.join(root, "supabase", "migrations");
const shimPath = path.join(root, "tests", "db", "shim", "supabase-shim.sql");

export interface TestDb {
  /** Conexão como superusuário (equivalente ao "postgres" do Supabase). */
  admin: Client;
  dbName: string;
  url: string;
  close: () => Promise<void>;
}

function adminUrl(): string {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error(
      "TEST_DATABASE_URL não definido. Rode `npm run test:db`, que sobe um PostgreSQL temporário.",
    );
  }
  return url;
}

export function migrationFiles(): string[] {
  return readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
}

/** Cria um banco novo, aplica o shim do Supabase e todas as migrações. */
export async function createTestDb(): Promise<TestDb> {
  const base = adminUrl();
  const dbName = `sf_test_${randomUUID().replace(/-/g, "").slice(0, 16)}`;

  const server = new Client({ connectionString: base });
  await server.connect();
  await server.query(`create database ${dbName}`);
  await server.end();

  const url = new URL(base);
  url.pathname = `/${dbName}`;
  const admin = new Client({ connectionString: url.toString() });
  await admin.connect();

  await admin.query(readFileSync(shimPath, "utf8"));
  for (const file of migrationFiles()) {
    try {
      await admin.query(readFileSync(path.join(migrationsDir, file), "utf8"));
    } catch (err) {
      throw new Error(`Falha ao aplicar a migração ${file}: ${(err as Error).message}`);
    }
  }

  return {
    admin,
    dbName,
    url: url.toString(),
    close: async () => {
      await admin.end();
      const s = new Client({ connectionString: base });
      await s.connect();
      await s.query(`drop database if exists ${dbName} with (force)`);
      await s.end();
    },
  };
}

/** Cria um usuário em auth.users (autorizando o e-mail antes). */
export async function createUser(db: TestDb, email: string): Promise<string> {
  await db.admin.query(
    "insert into public.allowed_emails (email) values ($1) on conflict do nothing",
    [email],
  );
  const res = await db.admin.query<{ id: string }>(
    "insert into auth.users (email) values ($1) returning id",
    [email],
  );
  return res.rows[0]!.id;
}

type Role = "authenticated" | "anon" | "service_role";

/**
 * Executa `fn` dentro de uma transação com o papel e as claims JWT indicados,
 * exatamente como o PostgREST faz para cada requisição.
 * A transação é sempre desfeita ao final, a menos que `commit` seja true.
 */
export async function asRole<T>(
  db: TestDb,
  role: Role,
  userId: string | null,
  fn: (c: Client) => Promise<T>,
  opts: { commit?: boolean } = {},
): Promise<T> {
  const c = db.admin;
  await c.query("begin");
  try {
    const claims = userId ? { sub: userId, role } : { role };
    await c.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify(claims)]);
    await c.query(`set local role ${role}`);
    const result = await fn(c);
    await c.query(opts.commit ? "commit" : "rollback");
    return result;
  } catch (err) {
    await c.query("rollback");
    throw err;
  }
}

export const asUser = <T>(
  db: TestDb,
  userId: string,
  fn: (c: Client) => Promise<T>,
  opts?: { commit?: boolean },
) => asRole(db, "authenticated", userId, fn, opts);

export const asAnon = <T>(db: TestDb, fn: (c: Client) => Promise<T>) =>
  asRole(db, "anon", null, fn);

export const asService = <T>(db: TestDb, fn: (c: Client) => Promise<T>, opts?: { commit?: boolean }) =>
  asRole(db, "service_role", null, fn, opts);

/** Retorna o código SQLSTATE de um erro do pg (ou undefined). */
export function pgCode(err: unknown): string | undefined {
  return typeof err === "object" && err !== null && "code" in err
    ? String((err as { code: unknown }).code)
    : undefined;
}

export async function expectPgError(promise: Promise<unknown>, codes: string[]): Promise<string> {
  try {
    await promise;
  } catch (err) {
    const code = pgCode(err);
    if (code && codes.includes(code)) return (err as Error).message;
    throw new Error(
      `Esperava erro SQLSTATE ${codes.join("/")}, recebi ${code ?? "?"}: ${(err as Error).message}`,
    );
  }
  throw new Error(`Esperava erro SQLSTATE ${codes.join("/")}, mas a operação foi aceita.`);
}

/**
 * Executa uma instrução dentro de um SAVEPOINT, permitindo testar falhas sem
 * abortar a transação inteira.
 */
export async function attempt<R extends QueryResultRow = QueryResultRow>(
  c: Client,
  sql: string,
  params?: unknown[],
): Promise<QueryResult<R>> {
  await c.query("savepoint sf_attempt");
  try {
    const res = await c.query<R>(sql, params);
    await c.query("release savepoint sf_attempt");
    return res;
  } catch (err) {
    await c.query("rollback to savepoint sf_attempt");
    throw err;
  }
}
