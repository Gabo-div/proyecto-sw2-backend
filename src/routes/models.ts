import { Hono } from "hono";
import { db } from "@/db";
import { and, eq, exists, inArray } from "drizzle-orm";
import { models, modelsCategories, modelsSubcategories } from "@/db/schema";

import fs from "node:fs/promises";
import path from "node:path";
import fsSync from "node:fs";
import { stream } from "hono/streaming";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod/v4";

const app = new Hono();

app.get(
  "/",
  zValidator(
    "query",
    z.object({
      page: z.coerce.number().default(1),
      pageSize: z.coerce.number().default(10),
      categories: z
        .string()
        .transform((v) => v.split(",").map(Number))
        .pipe(z.number().array())
        .default([]),
      subcategories: z
        .string()
        .transform((v) => v.split(",").map(Number))
        .pipe(z.number().array())
        .default([]),
    }),
  ),
  async (c) => {
    try {
      const { page, pageSize, categories, subcategories } =
        c.req.valid("query");

      const offset = (page - 1) * pageSize;

      console.log({ subcategories, categories });

      const sq = subcategories.length
        ? db
            .select({
              subcategoryId: modelsSubcategories.subcategoryId,
            })
            .from(modelsSubcategories)
            .where(
              and(
                eq(modelsSubcategories.modelId, models.id),
                inArray(modelsSubcategories.subcategoryId, subcategories),
              ),
            )
        : db
            .select({
              categoryId: modelsCategories.categoryId,
            })
            .from(modelsCategories)
            .where(
              and(
                eq(modelsCategories.modelId, models.id),
                inArray(modelsCategories.categoryId, categories),
              ),
            );

      const modelsWithLimit = db.$with("modelsWithLimit").as(
        db
          .select()
          .from(models)
          .where(
            categories.length || subcategories.length ? exists(sq) : undefined,
          )
          .limit(pageSize + 1)
          .offset(offset),
      );

      const rows = await db
        .with(modelsWithLimit)
        .select({
          model: {
            id: modelsWithLimit.id,
            name: modelsWithLimit.name,
            url: modelsWithLimit.url,
          },
          categoryId: modelsCategories.categoryId,
          subcategoryId: modelsSubcategories.subcategoryId,
        })
        .from(modelsWithLimit)
        .leftJoin(
          modelsCategories,
          eq(modelsCategories.modelId, modelsWithLimit.id),
        )
        .leftJoin(
          modelsSubcategories,
          eq(modelsSubcategories.modelId, modelsWithLimit.id),
        );

      const result = rows.reduce<
        Record<
          string,
          typeof models.$inferInsert & {
            categories: number[];
            subcategories: number[];
          }
        >
      >((acc, row) => {
        const rowModel = row.model;
        const rowCategoryId = row.categoryId;
        const rowSubcategoryId = row.subcategoryId;

        if (!acc[rowModel.id]) {
          acc[rowModel.id] = { ...rowModel, categories: [], subcategories: [] };
        }

        if (
          rowCategoryId &&
          !acc[rowModel.id].categories.includes(rowCategoryId)
        ) {
          acc[rowModel.id].categories.push(rowCategoryId);
        }

        if (
          rowSubcategoryId &&
          !acc[rowModel.id].subcategories.includes(rowSubcategoryId)
        ) {
          acc[rowModel.id].subcategories.push(rowSubcategoryId);
        }

        return acc;
      }, {});

      const resultArray = Object.values(result);

      return c.json({
        page: page,
        pageSize: pageSize,
        total: resultArray.length,
        data: resultArray,
      });
    } catch (error) {
      console.error("Failed to fetch all models:", error);
      c.status(500);
      return c.json({ error: "An internal server error occurred" });
    }
  },
);

app.post("/sync-from-assets", async (c) => {
  try {
    const modelsDir = path.join(process.cwd(), "static");

    const filesInDir = await fs.readdir(modelsDir);

    const glbFiles = filesInDir.filter((file) => file.endsWith(".glb"));

    if (glbFiles.length === 0) {
      return c.json({ message: "No .glb files found in static" }, 404);
    }

    const existingModels = await db.select({ url: models.url }).from(models);
    const existingUrls = new Set(existingModels.map((m) => m.url));

    const newModelsToInsert = glbFiles
      .map((fileName) => {
        const relativeUrl = path.join("static", fileName).replace(/\\/g, "/");

        const modelName = path.parse(fileName).name;

        return {
          name: modelName,
          url: relativeUrl,
        };
      })
      .filter((model) => !existingUrls.has(model.url));

    if (newModelsToInsert.length === 0) {
      return c.json({
        message: "All models are already in sync with the database.",
      });
    }

    const result = await db
      .insert(models)
      .values(newModelsToInsert)
      .returning();

    return c.json({
      message: `Successfully synced ${result.length} new models.`,
      data: result,
    });
  } catch (error) {
    console.error("Failed to sync models from assets:", error);
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return c.json(
        { error: "The assets/models directory does not exist." },
        500,
      );
    }
    return c.json({ error: "An internal server error occurred." }, 500);
  }
});

app.get("/static/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const modelId = parseInt(id, 10);

    if (isNaN(modelId)) {
      return c.json({ error: "Invalid model ID" }, 400);
    }

    const model = await db
      .select()
      .from(models)
      .where(eq(models.id, modelId))
      .limit(1);

    if (model.length === 0) {
      return c.json({ error: "Model not found" }, 404);
    }

    const modelData = model[0];
    const filePath = path.join(process.cwd(), modelData.url);

    if (!fsSync.existsSync(filePath)) {
      console.error(
        `File not found at path: ${filePath}. DB might be out of sync.`,
      );
      return c.json({ error: "File not found on server" }, 404);
    }

    c.header("Content-Type", "model/gltf-binary");
    c.header(
      "Content-Disposition",
      `inline; filename="${path.basename(filePath)}"`,
    );

    return stream(c, async (honoStream) => {
      const nodeStream = fsSync.createReadStream(filePath);

      for await (const chunk of nodeStream) {
        await honoStream.write(chunk);
      }
    });
  } catch (error) {
    console.error(`Failed to serve model:`, error);
    return c.json({ error: "An internal server error occurred" }, 500);
  }
});

app.get("/:id", async (c) => {
  const id = c.req.param("id");
  const modelId = parseInt(id, 10);

  if (isNaN(modelId)) {
    return c.json({ error: "Invalid model ID" }, 400);
  }

  const modelData = await db.query.models.findFirst({
    where: eq(models.id, modelId),
    with: {
      modelsCategories: {
        columns: {
          categoryId: true,
        },
      },
      modelsSubcategories: {
        columns: {
          subcategoryId: true,
        },
      },
    },
  });

  if (!modelData) {
    return c.json({ error: "Model not found" }, 404);
  }

  return c.json({
    id: modelData.id,
    name: modelData.name,
    url: modelData.url,
    categories: modelData.modelsCategories.map((c) => c.categoryId),
    subcategories: modelData.modelsSubcategories.map((c) => c.subcategoryId),
  });
});

export default app;
