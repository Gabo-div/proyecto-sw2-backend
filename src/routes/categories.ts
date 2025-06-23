import { Hono } from "hono";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";

const app = new Hono();

app.get("/", (c) => {
  return c.json({});
});

app.get("/:id", async (c) => {
  const id = c.req.param("id");
  const categoryId = parseInt(id, 10);

  if (isNaN(categoryId)) {
    return c.json({ error: "invalid category ID" }, 400);
  }

  const categoryData = await db.query.categories.findFirst({
    where: eq(schema.categories.id, categoryId)
  });

  if (!categoryData) {
    return c.json({ error: "category ID not found" }, 400);
  }

  const response = {
    id: categoryData.id,
    name: categoryData.name
  }

  return c.json(response);
});

app.get("/:id/subcategories", (c) => {
  return c.json({});
});

export default app;
