import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const drizzleDir = path.join(rootDir, "drizzle");
const journalPath = path.join(drizzleDir, "meta", "_journal.json");

await loadEnvFile(".env");
await loadEnvFile(".env.local");

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to baseline development migrations.");
}

const journal = JSON.parse(await fs.readFile(journalPath, "utf8"));
const sql = postgres(databaseUrl, { max: 1 });

try {
  const [{ hasExistingSchema }] = await sql`
    SELECT (
      to_regclass('public.users') IS NOT NULL
      OR to_regclass('public.stories') IS NOT NULL
    ) AS "hasExistingSchema"
  `;

  if (!hasExistingSchema) {
    console.log("Fresh database detected; Drizzle will apply journaled migrations.");
    process.exit(0);
  }

  await sql`CREATE SCHEMA IF NOT EXISTS "drizzle"`;
  await sql`
    CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )
  `;

  const [{ count }] = await sql`
    SELECT count(*)::integer AS "count"
    FROM "drizzle"."__drizzle_migrations"
  `;

  if (count > 0) {
    console.log("Drizzle migration ledger already has entries; no baseline needed.");
    process.exit(0);
  }

  for (const entry of journal.entries) {
    const migrationSql = await fs.readFile(
      path.join(drizzleDir, `${entry.tag}.sql`),
      "utf8"
    );
    const hash = crypto.createHash("sha256").update(migrationSql).digest("hex");

    await sql`
      INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at")
      VALUES (${hash}, ${entry.when})
    `;
  }

  console.log(`Baselined ${journal.entries.length} journaled migrations.`);
} finally {
  await sql.end();
}

async function loadEnvFile(fileName) {
  const filePath = path.join(rootDir, fileName);
  let content;

  try {
    content = await fs.readFile(filePath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      return;
    }

    throw error;
  }

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();

    if (!key || process.env[key] !== undefined) {
      continue;
    }

    process.env[key] = unquote(trimmed.slice(index + 1).trim());
  }
}

function unquote(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}
