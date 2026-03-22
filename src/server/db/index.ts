import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import * as authSchema from "./auth-schema";
import { env } from "@/server/env";

const client = postgres(env.DATABASE_URL, {
  max: 25,
  idle_timeout: 30,
});
export const db = drizzle(client, { schema: { ...schema, ...authSchema } });
