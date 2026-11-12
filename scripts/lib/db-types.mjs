/**
 * Gera os tipos TypeScript do banco (formato aceito pelo supabase-js) a partir
 * do catálogo do PostgreSQL. Usado por tests/db/types.test.ts, que garante que
 * src/lib/supabase/database.types.ts está sincronizado com as migrações.
 *
 * Atualize com: npm run db:types
 */

const SCALARS = {
  uuid: "string",
  text: "string",
  varchar: "string",
  bpchar: "string",
  citext: "string",
  date: "string",
  time: "string",
  timetz: "string",
  timestamp: "string",
  timestamptz: "string",
  interval: "string",
  bytea: "string",
  int2: "number",
  int4: "number",
  int8: "number",
  float4: "number",
  float8: "number",
  numeric: "number",
  bool: "boolean",
  json: "Json",
  jsonb: "Json",
  void: "undefined",
};

function tsType(udt, tables) {
  if (udt.startsWith("_")) return `${tsType(udt.slice(1), tables)}[]`;
  if (SCALARS[udt]) return SCALARS[udt];
  if (tables.has(udt)) return `Database["public"]["Tables"]["${udt}"]["Row"]`;
  return "unknown";
}

const key = (name) => (/^[a-z_][a-z0-9_]*$/i.test(name) ? name : JSON.stringify(name));

/** @param {import("pg").Client} client */
export async function generateDatabaseTypes(client) {
  const tablesRes = await client.query(`
    select c.relname as name
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
    order by c.relname
  `);
  const tableNames = tablesRes.rows.map((r) => r.name);
  const tables = new Set(tableNames);

  const colsRes = await client.query(`
    select c.relname as table_name, a.attname as name, t.typname as udt,
           not a.attnotnull as nullable,
           (a.atthasdef or a.attidentity <> '' or a.attgenerated <> '') as has_default
    from pg_attribute a
    join pg_class c on c.oid = a.attrelid
    join pg_namespace n on n.oid = c.relnamespace
    join pg_type t on t.oid = a.atttypid
    where n.nspname = 'public' and c.relkind = 'r' and a.attnum > 0 and not a.attisdropped
    order by c.relname, a.attnum
  `);

  const fksRes = await client.query(`
    select con.conname as name, src.relname as table_name, dst.relname as ref_table,
           array(select a.attname::text from unnest(con.conkey) with ordinality k(attnum, ord)
                 join pg_attribute a on a.attrelid = con.conrelid and a.attnum = k.attnum order by k.ord) as columns,
           array(select a.attname::text from unnest(con.confkey) with ordinality k(attnum, ord)
                 join pg_attribute a on a.attrelid = con.confrelid and a.attnum = k.attnum order by k.ord) as ref_columns,
           exists (
             select 1 from pg_constraint u
             where u.conrelid = con.conrelid and u.contype in ('p', 'u')
               and (select array_agg(x order by x) from unnest(u.conkey) x) =
                   (select array_agg(x order by x) from unnest(con.conkey) x)
           ) as one_to_one
    from pg_constraint con
    join pg_class src on src.oid = con.conrelid
    join pg_namespace sn on sn.oid = src.relnamespace
    join pg_class dst on dst.oid = con.confrelid
    join pg_namespace dn on dn.oid = dst.relnamespace
    where con.contype = 'f' and sn.nspname = 'public' and dn.nspname = 'public'
    order by src.relname, con.conname
  `);

  const fnRes = await client.query(`
    select p.proname as name, p.proretset as returns_set, rt.typname as return_type,
           coalesce(p.proargnames, '{}') as arg_names, p.pronargdefaults as n_defaults,
           array(select t.typname::text from unnest(p.proargtypes) with ordinality a(oid, ord)
                 join pg_type t on t.oid = a.oid order by a.ord) as arg_types
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    join pg_type rt on rt.oid = p.prorettype
    where n.nspname = 'public' and rt.typname <> 'trigger'
      and (has_function_privilege('authenticated', p.oid, 'EXECUTE')
        or has_function_privilege('service_role', p.oid, 'EXECUTE'))
    order by p.proname
  `);

  const out = [];
  out.push("// Arquivo gerado automaticamente a partir das migrações. Não edite à mão.");
  out.push("// Atualize com: npm run db:types");
  out.push("");
  out.push("export type Json =");
  out.push("  | string");
  out.push("  | number");
  out.push("  | boolean");
  out.push("  | null");
  out.push("  | { [key: string]: Json | undefined }");
  out.push("  | Json[];");
  out.push("");
  out.push("export type Database = {");
  out.push('  __InternalSupabase: { PostgrestVersion: "12" };');
  out.push("  public: {");
  out.push("    Tables: {");
  for (const table of tableNames) {
    const cols = colsRes.rows.filter((c) => c.table_name === table);
    out.push(`      ${key(table)}: {`);
    out.push("        Row: {");
    for (const c of cols) {
      out.push(`          ${key(c.name)}: ${tsType(c.udt, tables)}${c.nullable ? " | null" : ""};`);
    }
    out.push("        };");
    out.push("        Insert: {");
    for (const c of cols) {
      const optional = c.nullable || c.has_default;
      out.push(`          ${key(c.name)}${optional ? "?" : ""}: ${tsType(c.udt, tables)}${c.nullable ? " | null" : ""};`);
    }
    out.push("        };");
    out.push("        Update: {");
    for (const c of cols) {
      out.push(`          ${key(c.name)}?: ${tsType(c.udt, tables)}${c.nullable ? " | null" : ""};`);
    }
    out.push("        };");
    const fks = fksRes.rows.filter((f) => f.table_name === table);
    if (fks.length === 0) {
      out.push("        Relationships: [];");
    } else {
      out.push("        Relationships: [");
      for (const f of fks) {
        out.push("          {");
        out.push(`            foreignKeyName: ${JSON.stringify(f.name)};`);
        out.push(`            columns: [${f.columns.map((c) => JSON.stringify(c)).join(", ")}];`);
        out.push(`            isOneToOne: ${f.one_to_one};`);
        out.push(`            referencedRelation: ${JSON.stringify(f.ref_table)};`);
        out.push(`            referencedColumns: [${f.ref_columns.map((c) => JSON.stringify(c)).join(", ")}];`);
        out.push("          },");
      }
      out.push("        ];");
    }
    out.push("      };");
  }
  out.push("    };");
  out.push("    Views: { [_ in never]: never };");
  out.push("    Functions: {");
  for (const fn of fnRes.rows) {
    const nArgs = fn.arg_types.length;
    const firstDefault = nArgs - fn.n_defaults;
    out.push(`      ${key(fn.name)}: {`);
    if (nArgs === 0) {
      out.push("        Args: never;");
    } else {
      out.push("        Args: {");
      fn.arg_types.forEach((t, i) => {
        const name = fn.arg_names[i] ?? `arg${i}`;
        const optional = i >= firstDefault;
        out.push(`          ${key(name)}${optional ? "?" : ""}: ${tsType(t, tables)};`);
      });
      out.push("        };");
    }
    const ret = tsType(fn.return_type, tables);
    out.push(`        Returns: ${fn.returns_set ? `${ret}[]` : ret};`);
    out.push("      };");
  }
  out.push("    };");
  out.push("    Enums: { [_ in never]: never };");
  out.push("    CompositeTypes: { [_ in never]: never };");
  out.push("  };");
  out.push("};");
  out.push("");
  out.push('type PublicSchema = Database["public"];');
  out.push("");
  out.push('export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];');
  out.push('export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"];');
  out.push('export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"];');
  out.push("");
  return out.join("\n");
}
