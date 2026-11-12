/**
 * Garante que os tipos TypeScript do banco estão sincronizados com as migrações.
 * Para regenerar: npm run db:types
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, expect, it } from "vitest";
import { generateDatabaseTypes } from "../../scripts/lib/db-types.mjs";
import { createTestDb, type TestDb } from "./helpers";

const target = fileURLToPath(new URL("../../src/lib/supabase/database.types.ts", import.meta.url));

let db: TestDb;

beforeAll(async () => {
  db = await createTestDb();
});

afterAll(async () => {
  await db?.close();
});

it("database.types.ts corresponde às migrações", async () => {
  const generated: string = await generateDatabaseTypes(db.admin);
  if (process.env.UPDATE_DB_TYPES === "1") {
    writeFileSync(target, generated);
  }
  expect(existsSync(target), "Rode `npm run db:types` para gerar o arquivo.").toBe(true);
  expect(readFileSync(target, "utf8")).toBe(generated);
});
