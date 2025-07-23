import * as fs from "fs/promises";
import * as path from "path";
import { db } from "@/db";
import { eq } from "drizzle-orm";

import {
  models,
  categories,
  subcategories,
  modelsCategories,
  modelsSubcategories,
} from "./schema";

interface ModelMetadata {
  category: string;
  subcategory: string;
}

export async function seed() {
  const directoryPath = path.join(process.cwd(), "static");
  console.log(`🔍 Escaneando el directorio: ${directoryPath}`);

  const allFiles = await fs.readdir(directoryPath);
  const glbFiles = allFiles.filter(
    (file) => path.extname(file).toLowerCase() === ".glb",
  );

  if (glbFiles.length === 0) {
    console.log("No se encontraron archivos .glb en el directorio.");
    return;
  }

  console.log(
    `✅ Se encontraron ${glbFiles.length} archivos .glb. Procesando...`,
  );

  for (const glbFile of glbFiles) {
    const modelName = path.basename(glbFile, ".glb");
    const glbFilePath = path.join(directoryPath, glbFile);
    const jsonFilePath = path.join(directoryPath, `${modelName}.json`);

    let metadata: ModelMetadata;

    // --- Lógica para obtener metadatos ---
    try {
      // Intenta leer el archivo .json
      const jsonContent = await fs.readFile(jsonFilePath, "utf-8");
      metadata = JSON.parse(jsonContent);

      // Valida que el JSON tenga la estructura correcta
      if (!metadata.category || !metadata.subcategory) {
        console.warn(
          `⚠️  Advertencia: El JSON para '${modelName}' es inválido. Se omite.`,
        );
        continue; // Salta al siguiente archivo .glb
      }
    } catch (error) {
      if (error.code === "ENOENT") {
        // Si el .json NO EXISTE, se asignan los valores por defecto.
        console.log(
          `ℹ️  No se encontró JSON para '${modelName}'. Se usará la categoría y subcategoría "Otros".`,
        );
        metadata = { category: "Otros", subcategory: "Otros" };
      } else {
        // Si hay otro error (ej. JSON mal formado), se omite el modelo.
        console.error(`❌ Error al leer o procesar ${modelName}.json:`, error);
        continue; // Salta al siguiente archivo .glb
      }
    }

    // --- Transacción en la Base de Datos ---
    // Esta parte se ejecuta con los metadatos del JSON o con los de por defecto.
    try {
      await db.transaction(async (tx) => {
        // 1. Insertar el modelo
        const [insertedModel] = await tx
          .insert(models)
          .values({ name: modelName, url: glbFilePath })
          .returning({ id: models.id });

        // 2. Procesar la Categoría
        await tx
          .insert(categories)
          .values({ name: metadata.category })
          .onConflictDoNothing();
        const [categoryRecord] = await tx
          .select({ id: categories.id })
          .from(categories)
          .where(eq(categories.name, metadata.category));

        if (!categoryRecord)
          throw new Error(
            `Falló la creación/búsqueda de la categoría: ${metadata.category}`,
          );

        // Vincular modelo y categoría
        await tx.insert(modelsCategories).values({
          modelId: insertedModel.id,
          categoryId: categoryRecord.id,
        });

        // 3. Procesar la Subcategoría
        await tx
          .insert(subcategories)
          .values({ name: metadata.subcategory, categoryId: categoryRecord.id })
          .onConflictDoNothing();
        const [subcategoryRecord] = await tx
          .select({ id: subcategories.id })
          .from(subcategories)
          .where(eq(subcategories.name, metadata.subcategory));

        if (!subcategoryRecord)
          throw new Error(
            `Falló la creación/búsqueda de la subcategoría: ${metadata.subcategory}`,
          );

        // Vincular modelo y subcategoría
        await tx.insert(modelsSubcategories).values({
          modelId: insertedModel.id,
          subcategoryId: subcategoryRecord.id,
        });

        console.log(
          `✔️ Modelo '${modelName}' [${metadata.category} > ${metadata.subcategory}] insertado.`,
        );
      });
    } catch (error) {
      console.error(
        `❌ Falló la transacción para el modelo ${modelName}:`,
        error,
      );
    }
  }
  console.log("\n✨ Proceso de población de la base de datos completado.");
}

seed().catch(console.error);
