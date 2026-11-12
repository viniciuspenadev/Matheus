#!/usr/bin/env node
/**
 * Executa os testes de banco (migrações, RLS, funções SQL) em um PostgreSQL real.
 *
 * Opções:
 *  1. Defina TEST_DATABASE_URL apontando para um servidor PostgreSQL 15+ em que o
 *     usuário possa criar bancos (ex.: postgres://postgres:postgres@127.0.0.1:54322/postgres
 *     do `supabase start`). Cada arquivo de teste cria e remove seu próprio banco.
 *  2. Sem TEST_DATABASE_URL, o script procura os binários do PostgreSQL
 *     (initdb/pg_ctl) e sobe um cluster temporário em .cache/, removido ao final.
 *
 * Nunca aponte TEST_DATABASE_URL para o banco de produção.
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, rmSync, chownSync } from "node:fs";
import { createServer } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { stdio: "inherit", ...opts });
  if (res.status !== 0) {
    throw new Error(`Falha ao executar: ${cmd} ${args.join(" ")}`);
  }
}

function findPgBin() {
  const candidates = [];
  if (process.env.PG_BIN) candidates.push(process.env.PG_BIN);
  const which = spawnSync(process.platform === "win32" ? "where" : "which", ["pg_ctl"], {
    encoding: "utf8",
  });
  if (which.status === 0 && which.stdout.trim()) {
    candidates.push(path.dirname(which.stdout.trim().split(/\r?\n/)[0]));
  }
  for (const base of ["/usr/lib/postgresql", "/opt/homebrew/opt", "/usr/local/opt"]) {
    if (!existsSync(base)) continue;
    const dirs = readdirSync(base)
      .filter((d) => /^(\d+|postgresql(@\d+)?)$/.test(d))
      .sort()
      .reverse();
    for (const d of dirs) candidates.push(path.join(base, d, "bin"));
  }
  return candidates.find((dir) => existsSync(path.join(dir, "initdb")) && existsSync(path.join(dir, "pg_ctl")));
}

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.unref();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

// --update-types regenera src/lib/supabase/database.types.ts (npm run db:types).
const updateTypes = process.argv.includes("--update-types");
const vitestArgs = updateTypes ? ["tests/db/types.test.ts"] : process.argv.slice(2);

function runVitest(env) {
  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      [path.join(root, "node_modules", "vitest", "vitest.mjs"), "run", "--project", "db", ...vitestArgs],
      { stdio: "inherit", env: { ...process.env, ...env, ...(updateTypes ? { UPDATE_DB_TYPES: "1" } : {}) }, cwd: root },
    );
    child.on("exit", (code) => resolve(code ?? 1));
  });
}

async function main() {
  if (process.env.TEST_DATABASE_URL) {
    console.log("Usando TEST_DATABASE_URL existente.");
    process.exit(await runVitest({}));
  }

  const bin = findPgBin();
  if (!bin) {
    console.error(
      "PostgreSQL não encontrado. Instale o PostgreSQL 15+ (initdb/pg_ctl) ou defina TEST_DATABASE_URL.",
    );
    process.exit(1);
  }

  // initdb se recusa a rodar como root; nesse caso usamos o usuário "postgres".
  const asRoot = typeof process.getuid === "function" && process.getuid() === 0;
  const wrap = (cmd, args) => (asRoot ? ["runuser", ["-u", "postgres", "--", cmd, ...args]] : [cmd, args]);

  const cacheDir = path.join(root, ".cache");
  mkdirSync(cacheDir, { recursive: true });
  const dataDir = path.join(cacheDir, `pgtest-${process.pid}-${Date.now()}`);
  mkdirSync(dataDir, { recursive: true });
  if (asRoot) {
    const id = spawnSync("id", ["-u", "postgres"], { encoding: "utf8" });
    const gid = spawnSync("id", ["-g", "postgres"], { encoding: "utf8" });
    chownSync(dataDir, Number(id.stdout.trim()), Number(gid.stdout.trim()));
  }

  const port = await freePort();
  const pgCtl = path.join(bin, "pg_ctl");
  let started = false;

  const stop = () => {
    if (started) {
      const [c, a] = wrap(pgCtl, ["-D", dataDir, "-m", "fast", "stop"]);
      spawnSync(c, a, { stdio: "ignore" });
      started = false;
    }
    rmSync(dataDir, { recursive: true, force: true });
  };
  process.on("SIGINT", () => {
    stop();
    process.exit(130);
  });

  try {
    console.log(`Criando cluster PostgreSQL temporário (${bin}) na porta ${port}...`);
    {
      const [c, a] = wrap(path.join(bin, "initdb"), [
        "-D", dataDir, "-U", "postgres", "--auth=trust", "--encoding=UTF8", "--no-locale",
      ]);
      run(c, a, { stdio: "ignore" });
    }
    {
      const [c, a] = wrap(pgCtl, [
        "-D", dataDir, "-l", path.join(dataDir, "server.log"), "-w",
        "-o", `-p ${port} -k ${dataDir} -c listen_addresses=127.0.0.1 -c fsync=off`,
        "start",
      ]);
      run(c, a, { stdio: "ignore" });
      started = true;
    }
    const code = await runVitest({
      TEST_DATABASE_URL: `postgres://postgres@127.0.0.1:${port}/postgres`,
    });
    stop();
    process.exit(code);
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    stop();
    process.exit(1);
  }
}

main();
