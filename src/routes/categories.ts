import { Hono } from "hono";

const app = new Hono();

app.get("/", (c) => {
  return c.json({});
});

app.get("/:id", (c) => {
  return c.json({});
});

app.get("/:id/subcategories", (c) => {
  return c.json({});
});

export default app;
