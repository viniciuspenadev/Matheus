import type { Client } from "pg";

export function generateDatabaseTypes(client: Client): Promise<string>;
