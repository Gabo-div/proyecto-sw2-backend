import { env } from "@/env";
import { drizzle } from "drizzle-orm/libsql";

import { createClient } from "@libsql/client";
import * as schema from "@/db/schema";

const client = createClient({
  url: env.DATABASE_URL,
  authToken: env.DATABASE_TOKEN,
});

export const db = drizzle(client, { schema });
