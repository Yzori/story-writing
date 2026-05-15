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
  throw new Error("DATABASE_URL is required to apply development migrations.");
}

const journal = JSON.parse(await fs.readFile(journalPath, "utf8"));
const journaledTags = new Set(journal.entries.map((entry) => entry.tag));
const files = (await fs.readdir(drizzleDir))
  .filter((file) => file.endsWith(".sql"))
  .sort((a, b) => a.localeCompare(b, "en"));

const devMigrationFiles = files.filter((file) => {
  const tag = file.replace(/\.sql$/, "");
  return !journaledTags.has(tag);
});

if (devMigrationFiles.length === 0) {
  console.log("No unjournaled development migrations to apply.");
  process.exit(0);
}

const sql = postgres(databaseUrl, { max: 1 });

try {
  await sql`
    CREATE TABLE IF NOT EXISTS "__dev_migrations" (
      "filename" text PRIMARY KEY,
      "applied_at" timestamptz NOT NULL DEFAULT now()
    )
  `;

  for (const file of devMigrationFiles) {
    const [{ exists }] = await sql`
      SELECT EXISTS (
        SELECT 1
        FROM "__dev_migrations"
        WHERE "filename" = ${file}
      ) AS "exists"
    `;

    if (exists) {
      console.log(`Skipping ${file}; already applied.`);
      continue;
    }

    const migrationSql = await fs.readFile(path.join(drizzleDir, file), "utf8");
    const statements = splitStatements(migrationSql);

    for (const statement of statements) {
      try {
        await sql.unsafe(statement);
      } catch (error) {
        if (isAlreadyAppliedError(error)) {
          console.log(`Skipping existing object in ${file}: ${error.message}`);
          continue;
        }

        throw error;
      }
    }

    await sql`
      INSERT INTO "__dev_migrations" ("filename")
      VALUES (${file})
    `;

    console.log(`Applied ${file}.`);
  }
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

function splitStatements(sqlText) {
  const sqlWithoutLineComments = sqlText
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");

  return sqlWithoutLineComments
    .split("--> statement-breakpoint")
    .flatMap((chunk) => chunk.split(";"))
    .map((statement) => statement.trim())
    .filter(Boolean);
}

function isAlreadyAppliedError(error) {
  return new Set([
    "42701", // duplicate_column
    "42P07", // duplicate_table / duplicate_relation
    "42710", // duplicate_object
  ]).has(error.code);
}
