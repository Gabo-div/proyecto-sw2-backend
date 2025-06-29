import { serve } from "@hono/node-server";
import { Hono } from "hono";
import modelsRoutes from "@/routes/models";
import categoriesRoutes from "@/routes/categories";

import { db } from "@/db";
import { sql } from "drizzle-orm";

const app = new Hono();

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

app.get("/health", async (c) => {
  try {
    await db.run(sql`SELECT 1`);

    console.log("Health check: Database connection is OK.");
    return c.json({
      status: "ok",
      message: "¡Se conectó exitosamente a Turso!",
    });
  } catch (error) {
    console.error("Health check: Failed to connect to the database.", error);

    c.status(503);
    return c.json({
      status: "error",
      message: "No se pudo conectar a la base de datos.",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

app.route("/models", modelsRoutes);
app.route("/categories", categoriesRoutes);

serve(
  {
    fetch: app.fetch,
    port: 3000,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  },
);
