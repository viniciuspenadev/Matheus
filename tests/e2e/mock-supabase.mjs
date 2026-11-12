/**
 * SUPABASE SIMULADO — usado exclusivamente pelos testes Playwright de interface.
 *
 * Implementa o subconjunto da API do GoTrue (/auth/v1) e do PostgREST (/rest/v1)
 * que as telas da Etapa 1 utilizam, com dados em memória. NÃO reproduz RLS nem
 * as regras do banco: elas são verificadas pelos testes em PostgreSQL real
 * (tests/db). O objetivo aqui é exercitar a interface, as Server Actions, os
 * redirecionamentos e a sessão em cookies num navegador de verdade.
 *
 * Uso: node tests/e2e/mock-supabase.mjs  (porta em MOCK_SUPABASE_PORT, padrão 54399)
 */
import { createHash, createHmac, randomUUID } from "node:crypto";
import { createServer } from "node:http";

const PORT = Number(process.env.MOCK_SUPABASE_PORT ?? 54399);
export const MOCK_USERS = [
  { id: "11111111-1111-4111-8111-111111111111", email: "aluno@exemplo.com", password: "senha-correta" },
  // Existe no "Auth", mas fica fora de ALLOWED_EMAILS (simula conta revogada).
  { id: "22222222-2222-4222-8222-222222222222", email: "revogado@exemplo.com", password: "senha-correta" },
];

const now = () => new Date().toISOString();
const b64url = (buf) => Buffer.from(buf).toString("base64url");

function jwtFor(user) {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const payload = b64url(
    JSON.stringify({ sub: user.id, email: user.email, role: "authenticated", aud: "authenticated", exp, iat: exp - 3600 }),
  );
  const sig = createHmac("sha256", "mock-secret").update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${sig}`;
}

function userJson(user) {
  return {
    id: user.id,
    aud: "authenticated",
    role: "authenticated",
    email: user.email,
    email_confirmed_at: now(),
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: {},
    identities: [],
    created_at: now(),
    updated_at: now(),
  };
}

// ---------------------------------------------------------------------------
// Dados em memória
// ---------------------------------------------------------------------------
const db = { courses: [], subjects: [], lessons: [], transcriptions: [] };

function seed() {
  const owner = MOCK_USERS[0].id;
  const course = { id: randomUUID(), user_id: owner, name: "Biotecnologia", institution: "Universidade Exemplo", created_at: now(), updated_at: now() };
  db.courses.push(course);
  const bq = {
    id: randomUUID(), user_id: owner, course_id: course.id, name: "Bioquímica I", code: "BQ101", professor: "Profa. Ana Lima",
    description: "Metabolismo energético e enzimologia.", keywords: ["enzimas", "glicólise", "gliconeogênese", "ATP"], created_at: now(), updated_at: now(),
  };
  db.subjects.push(bq);
  const lesson = {
    id: randomUUID(), user_id: owner, subject_id: bq.id, title: "Aula 1 — Introdução às enzimas", lesson_date: "2026-11-03",
    notes: null, source_type: "text", status: "transcribed", status_message: "Transcrição importada.", last_error: null, created_at: now(), updated_at: now(),
  };
  db.lessons.push(lesson);
  addTranscription(owner, lesson.id, "text_paste", null,
    "Bom dia, pessoal. Hoje vamos começar o estudo das enzimas.\n\nEnzimas são catalisadores biológicos: aceleram reações sem serem consumidas.\n\nNa próxima aula veremos a glicólise.");
}

function addTranscription(userId, lessonId, source, filename, text) {
  const row = {
    id: randomUUID(), user_id: userId, lesson_id: lessonId, source, original_text: text, edited_text: null, edited_at: null,
    source_filename: filename, word_count: text.trim().split(/\s+/).length, char_count: text.length,
    integrity_status: "not_applicable", content_sha256: createHash("sha256").update(text).digest("hex"), created_at: now(), updated_at: now(),
  };
  db.transcriptions.push(row);
  return row;
}

// Campos "embutidos" que o PostgREST devolveria nos selects usados pelo app.
function withEmbeds(table, row) {
  if (table === "subjects") {
    const course = db.courses.find((c) => c.id === row.course_id);
    return { ...row, courses: course ? { name: course.name } : null, lessons: [{ count: db.lessons.filter((l) => l.subject_id === row.id).length }] };
  }
  if (table === "courses") {
    return { ...row, subjects: [{ count: db.subjects.filter((s) => s.course_id === row.id).length }] };
  }
  if (table === "lessons") {
    const subject = db.subjects.find((s) => s.id === row.subject_id);
    return { ...row, subjects: subject ? { name: subject.name } : null };
  }
  if (table === "transcriptions") {
    const lesson = db.lessons.find((l) => l.id === row.lesson_id);
    const subject = lesson && db.subjects.find((s) => s.id === lesson.subject_id);
    return { ...row, lessons: lesson ? { title: lesson.title, subjects: subject ? { name: subject.name } : null } : null };
  }
  return row;
}

// ---------------------------------------------------------------------------
// Utilidades HTTP
// ---------------------------------------------------------------------------
function send(res, status, body, headers = {}) {
  const payload = body === undefined ? "" : JSON.stringify(body);
  res.writeHead(status, { "content-type": "application/json", ...headers });
  res.end(payload);
}

const pgError = (res, status, code, message) => send(res, status, { code, message, details: null, hint: null });

async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function currentUser(req) {
  const token = (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
  const [, payload] = token.split(".");
  if (!payload) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return MOCK_USERS.find((u) => u.id === claims.sub) ?? null;
  } catch {
    return null;
  }
}

function applyFilters(rows, params) {
  let out = rows;
  for (const [key, value] of params.entries()) {
    if (["select", "order", "limit", "offset", "columns"].includes(key)) continue;
    if (value.startsWith("eq.")) out = out.filter((r) => String(r[key]) === value.slice(3));
    else if (value.startsWith("in.(")) {
      const list = value.slice(4, -1).split(",").map((v) => v.replace(/^"|"$/g, ""));
      out = out.filter((r) => list.includes(String(r[key])));
    }
  }
  const limit = params.get("limit");
  return limit ? out.slice(0, Number(limit)) : out;
}

function sortRows(table, rows) {
  if (table === "subjects" || table === "courses") return [...rows].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  return [...rows].sort((a, b) => (b.created_at > a.created_at ? 1 : -1));
}

// ---------------------------------------------------------------------------
// Rotas
// ---------------------------------------------------------------------------
async function handleAuth(req, res, path, url) {
  if (path === "/auth/v1/token" && url.searchParams.get("grant_type") === "password") {
    const { email, password } = await readBody(req);
    const user = MOCK_USERS.find((u) => u.email === String(email).toLowerCase() && u.password === password);
    if (!user) return send(res, 400, { code: "invalid_credentials", error_code: "invalid_credentials", msg: "Invalid login credentials" });
    const expires_in = 3600;
    return send(res, 200, {
      access_token: jwtFor(user), token_type: "bearer", expires_in, expires_at: Math.floor(Date.now() / 1000) + expires_in,
      refresh_token: randomUUID(), user: userJson(user),
    });
  }
  if (path === "/auth/v1/user") {
    const user = currentUser(req);
    return user ? send(res, 200, userJson(user)) : send(res, 401, { code: "bad_jwt", msg: "invalid JWT" });
  }
  if (path === "/auth/v1/logout") {
    res.writeHead(204);
    return res.end();
  }
  return send(res, 404, { msg: "not found" });
}

async function handleRpc(req, res, name, user) {
  if (name !== "import_transcription") return pgError(res, 404, "PGRST202", "function not found");
  const args = await readBody(req);
  const text = String(args.p_text ?? "").trim();
  if (!text) return pgError(res, 400, "22023", "A transcrição está vazia.");
  let lesson;
  if (args.p_lesson_id) {
    lesson = db.lessons.find((l) => l.id === args.p_lesson_id && l.user_id === user.id);
    if (!lesson) return pgError(res, 400, "P0002", "Aula não encontrada.");
    if (db.transcriptions.some((t) => t.lesson_id === lesson.id)) return pgError(res, 409, "23505", "Esta aula já possui uma transcrição.");
  } else {
    const subject = db.subjects.find((s) => s.id === args.p_subject_id && s.user_id === user.id);
    if (!subject) return pgError(res, 400, "P0002", "Disciplina não encontrada.");
    lesson = {
      id: randomUUID(), user_id: user.id, subject_id: subject.id, title: String(args.p_title).trim(), lesson_date: args.p_lesson_date ?? null,
      notes: null, source_type: null, status: "draft", status_message: null, last_error: null, created_at: now(), updated_at: now(),
    };
    db.lessons.push(lesson);
  }
  addTranscription(user.id, lesson.id, args.p_source, args.p_source_filename ?? null, text);
  Object.assign(lesson, { source_type: "text", status: "transcribed", status_message: "Transcrição importada.", updated_at: now() });
  return send(res, 200, lesson.id);
}

async function handleRest(req, res, path, url) {
  const user = currentUser(req);
  if (!user) return pgError(res, 401, "PGRST301", "JWT required");
  if (path.startsWith("/rest/v1/rpc/")) return handleRpc(req, res, path.slice("/rest/v1/rpc/".length), user);

  const table = path.slice("/rest/v1/".length);
  if (!(table in db)) return pgError(res, 404, "42P01", `relation "${table}" does not exist`);
  const own = db[table].filter((r) => r.user_id === user.id);
  const wantsObject = (req.headers.accept ?? "").includes("vnd.pgrst.object");
  const prefer = req.headers.prefer ?? "";

  const respondRows = (rows) => {
    const embedded = rows.map((r) => withEmbeds(table, r));
    const headers = /count=exact/.test(prefer) ? { "content-range": `0-${Math.max(embedded.length - 1, 0)}/${embedded.length}` } : {};
    if (req.method === "HEAD") {
      res.writeHead(200, headers);
      return res.end();
    }
    if (wantsObject) {
      return embedded.length === 1 ? send(res, 200, embedded[0], headers) : pgError(res, 406, "PGRST116", "JSON object requested, multiple (or no) rows returned");
    }
    return send(res, 200, embedded, headers);
  };

  if (req.method === "GET" || req.method === "HEAD") {
    const filtered = applyFilters(sortRows(table, own), url.searchParams);
    if (/count=exact/.test(prefer)) {
      const total = applyFilters(own, new URLSearchParams([...url.searchParams].filter(([k]) => k !== "limit"))).length;
      const embedded = filtered.map((r) => withEmbeds(table, r));
      res.writeHead(200, { "content-type": "application/json", "content-range": `0-${Math.max(filtered.length - 1, 0)}/${total}` });
      return res.end(req.method === "HEAD" ? "" : JSON.stringify(embedded));
    }
    return respondRows(filtered);
  }

  if (req.method === "POST") {
    const body = await readBody(req);
    const rows = Array.isArray(body) ? body : [body];
    const created = [];
    for (const input of rows) {
      if (table === "subjects" && own.some((s) => s.name.toLowerCase() === String(input.name).toLowerCase())) {
        return pgError(res, 409, "23505", 'duplicate key value violates unique constraint "subjects_user_name_key"');
      }
      const row = {
        id: randomUUID(), user_id: user.id, created_at: now(), updated_at: now(),
        ...(table === "lessons" ? { status: "draft", source_type: null, status_message: null, last_error: null } : {}),
        ...(table === "subjects" ? { keywords: [] } : {}),
        ...input,
      };
      db[table].push(row);
      created.push(row);
    }
    return respondRows(created);
  }

  if (req.method === "PATCH") {
    const body = await readBody(req);
    const targets = applyFilters(own, url.searchParams);
    for (const row of targets) {
      Object.assign(row, body, { updated_at: now() });
      if (table === "transcriptions" && "edited_text" in body) {
        if (row.edited_text === row.original_text) row.edited_text = null;
        row.edited_at = row.edited_text === null ? null : now();
      }
    }
    return respondRows(targets);
  }

  if (req.method === "DELETE") {
    const targets = applyFilters(own, url.searchParams);
    if (table === "subjects" && targets.some((s) => db.lessons.some((l) => l.subject_id === s.id))) {
      return pgError(res, 409, "23503", "update or delete on table subjects violates foreign key constraint");
    }
    db[table] = db[table].filter((r) => !targets.includes(r));
    if (table === "lessons") db.transcriptions = db.transcriptions.filter((t) => !targets.some((l) => l.id === t.lesson_id));
    if (table === "courses") db.subjects.forEach((s) => targets.some((c) => c.id === s.course_id) && (s.course_id = null));
    return respondRows(targets);
  }

  return pgError(res, 405, "PGRST000", "method not allowed");
}

seed();

createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
    const path = url.pathname;
    if (path === "/health") return send(res, 200, { ok: true });
    if (path === "/__reset") {
      for (const k of Object.keys(db)) db[k] = [];
      seed();
      return send(res, 200, { ok: true });
    }
    if (path.startsWith("/auth/v1/")) return await handleAuth(req, res, path, url);
    if (path.startsWith("/rest/v1/")) return await handleRest(req, res, path, url);
    return send(res, 404, { message: "not found" });
  } catch (err) {
    console.error("[mock-supabase]", err);
    return send(res, 500, { message: "mock error" });
  }
}).listen(PORT, "127.0.0.1", () => {
  console.log(`[mock-supabase] ouvindo em http://127.0.0.1:${PORT}`);
});
