import { Hono } from "hono";
import { db } from "@/db";
import { categories, subcategories } from "@/db/schema";
import { eq } from "drizzle-orm";

const app = new Hono();

app.get("/", async (c) => {
  try {
    const page = c.req.query("page");
    const pageSize = c.req.query("pageSize");

    const pageNumber = Number(page) || 1;
    const pageSizeNumber = Number(pageSize) || 10;

    const offset = (pageNumber - 1) * pageSizeNumber;

    const result = await db
      .select({
        id: categories.id,
        name: categories.name,
      })
      .from(categories)
      .limit(pageSizeNumber)
      .offset(offset)
      .all();

    const response = {
      page: pageNumber,
      pageSize: pageSizeNumber,
      total: result.length,
      data: result,
    };
    return c.json({ response });
  } catch (error) {
    console.error("Failed to fetch all categories:", error);
    c.status(500);
    return c.json({ error: "An internal server error occurred" });
  }
});

app.get("/:id", (c) => {
  return c.json({});
});

app.get("/:id/subcategories", async (c) => {
  try {
    const id = c.req.param("id");
    const categoryId = parseInt(id, 10);

    if (isNaN(categoryId)) {
      return c.json({ error: "Invalid category ID" }, 400);
    }

    const page = c.req.query("page");
    const pageSize = c.req.query("pageSize");

    const pageNumber = Number(page) || 1;
    const pageSizeNumber = Number(pageSize) || 10;

    const offset = (pageNumber - 1) * pageSizeNumber;

    const result = await db
      .select({
        id: subcategories.id,
        name: subcategories.name,
      })
      .from(subcategories)
      .where(eq(subcategories.categoryId, categoryId))
      .limit(pageSizeNumber)
      .offset(offset)
      .all();

    const response = {
      page: pageNumber,
      pageSize: pageSizeNumber,
      total: result.length,
      data: result,
    };

    return c.json({ response });
  } catch (error) {
    console.error("Failed to fetch all categories:", error);
    c.status(500);
    return c.json({ error: "An internal server error occurred" });
  }
});

export default app;
