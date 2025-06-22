import { Hono } from "hono";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema";

import fs from "node:fs/promises";
import path from "node:path";
import fsSync from "node:fs";
import { stream } from "hono/streaming"; 

const app = new Hono();

app.get("/all", async (c) => {
  try {
    // 1. Usamos findMany() para obtener todos los registros de la tabla 'models'.
    const allModelsData = await db.query.models.findMany({
      // 2. La cláusula 'with' es idéntica a la de la ruta /:id.
      // Le pedimos a Drizzle que cargue las relaciones para CADA modelo.
      with: {
        modelsCategories: {
          with: {
            category: true,
          },
        },
        modelsSubcategories: {
          with: {
            subcategory: true,
          },
        },
      },
      // Opcional: puedes añadir un ordenamiento
      orderBy: (models, { asc }) => [asc(models.name)],
    });

    // 3. Si no hay modelos, devolvemos un arreglo vacío (lo cual es correcto).
    if (allModelsData.length === 0) {
      return c.json([]);
    }

    // 4. Mapeamos la lista completa de modelos para darles el formato final.
    // El 'map' exterior recorre cada modelo, y el 'map' interior sus relaciones.
    const response = allModelsData.map((modelData) => {
      return {
        id: modelData.id,
        name: modelData.name,
        url: modelData.url,
        categories: modelData.modelsCategories.map((mtc) => mtc.category),
        subcategories: modelData.modelsSubcategories.map((mts) => mts.subcategory),
      };
    });

    return c.json(response);

  } catch (error) {
    console.error("Failed to fetch all models:", error);
    c.status(500);
    return c.json({ error: "An internal server error occurred" });
  }
});


app.post("/sync-from-assets", async (c) => {
  try {
    const modelsDir = path.join(process.cwd(), "static");

    const filesInDir = await fs.readdir(modelsDir);

    const glbFiles = filesInDir.filter((file) => file.endsWith(".glb"));

    if (glbFiles.length === 0) {
      return c.json({ message: "No .glb files found in static" }, 404);
    }

    const existingModels = await db.select({ url: schema.models.url }).from(schema.models);
    const existingUrls = new Set(existingModels.map((m) => m.url));

    const newModelsToInsert = glbFiles
      .map((fileName) => {
        // La URL que guardaremos será relativa, para que sea más portable
        const relativeUrl = path.join("static", fileName).replace(/\\/g, "/");
        
        const modelName = path.parse(fileName).name;

        return {
          name: modelName,
          url: relativeUrl,
        };
      })
      .filter((model) => !existingUrls.has(model.url));

    if (newModelsToInsert.length === 0) {
      return c.json({ message: "All models are already in sync with the database." });
    }

    const result = await db.insert(schema.models).values(newModelsToInsert).returning();

    return c.json({
      message: `Successfully synced ${result.length} new models.`,
      data: result,
    });

  } catch (error) {
    console.error("Failed to sync models from assets:", error);
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return c.json({ error: "The assets/models directory does not exist." }, 500);
    }
    return c.json({ error: "An internal server error occurred." }, 500);
  }
});

// Devuelve el archivo .glb físico correspondiente a un ID de modelo.
app.get("/static/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const modelId = parseInt(id, 10);

    if (isNaN(modelId)) {
      return c.json({ error: "Invalid model ID" }, 400);
    }

    const model = await db
      .select()
      .from(schema.models)
      .where(eq(schema.models.id, modelId))
      .limit(1);

    if (model.length === 0) {
      return c.json({ error: "Model not found" }, 404);
    }

    const modelData = model[0];
    const filePath = path.join(process.cwd(), "src", modelData.url);

    if (!fsSync.existsSync(filePath)) {
      console.error(`File not found at path: ${filePath}. DB might be out of sync.`);
      return c.json({ error: "File not found on server" }, 404);
    }

    c.header("Content-Type", "model/gltf-binary");
    c.header("Content-Disposition", `inline; filename="${path.basename(filePath)}"`);

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
    where: eq(schema.models.id, modelId),
    with: {
      modelsCategories: {
        with: {
          category: true, 
        },
      },
      modelsSubcategories: {
        with: {
          subcategory: true, 
        },
      },
    },
  });

  if (!modelData) {
    return c.json({ error: "Model not found" }, 404);
  }

  const response = {
    id: modelData.id,
    name: modelData.name,
    url: modelData.url,
    categories: modelData.modelsCategories.map((mtc) => mtc.category),
    subcategories: modelData.modelsSubcategories.map((mts) => mts.subcategory),
  };

  return c.json(response);
});

export default app;


