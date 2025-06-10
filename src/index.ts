import { serve } from "@hono/node-server";
import { Hono } from "hono";
import modelsRoutes from "@/routes/models";
import categoriesRoutes from "@/routes/categories";

const app = new Hono();

app.get("/", (c) => {
  return c.text("Hello Hono!");
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
