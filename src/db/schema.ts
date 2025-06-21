import { int, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

export const models = sqliteTable("models", {
  id: int().primaryKey({ autoIncrement: true }),
  name: text().notNull(),
  url: text().notNull(),
});

export const categories = sqliteTable("categories", {
  id: int().primaryKey({ autoIncrement: true }),
  name: text().notNull().unique(),
});

export const subcategories = sqliteTable("subcategories", {
  id: int().primaryKey({ autoIncrement: true }),
  categoryId: int().references(() => categories.id),
  name: text().notNull().unique(),
});

export const modelsCategories = sqliteTable(
  "models_categories",
  {
    modelId: int().references(() => models.id),
    categoryId: int().references(() => categories.id),
  },
  (table) => [primaryKey({ columns: [table.modelId, table.categoryId] })],
);

export const modelsSubcategories = sqliteTable(
  "models_subcategories",
  {
    modelId: int().references(() => models.id),
    subcategoryId: int().references(() => subcategories.id),
  },
  (table) => [primaryKey({ columns: [table.modelId, table.subcategoryId] })],
);


export const modelsRelations = relations(models, ({ many }) => ({
  modelsCategories: many(modelsCategories),
  modelsSubcategories: many(modelsSubcategories),
}));

// Una categoría puede tener muchas entradas en la tabla de unión
export const categoriesRelations = relations(categories, ({ many }) => ({
  modelsCategories: many(modelsCategories),
}));

// Una subcategoría puede tener muchas entradas en la tabla de unión
export const subcategoriesRelations = relations(subcategories, ({ many }) => ({
  modelsSubcategories: many(modelsSubcategories),
}));

// Relaciones para la tabla de unión de categorías
export const modelsCategoriesRelations = relations(modelsCategories, ({ one }) => ({
  model: one(models, {
    fields: [modelsCategories.modelId],
    references: [models.id],
  }),
  category: one(categories, {
    fields: [modelsCategories.categoryId],
    references: [categories.id],
  }),
}));

// Relaciones para la tabla de unión de subcategorías
export const modelsSubcategoriesRelations = relations(modelsSubcategories, ({ one }) => ({
  model: one(models, {
    fields: [modelsSubcategories.modelId],
    references: [models.id],
  }),
  subcategory: one(subcategories, {
    fields: [modelsSubcategories.subcategoryId],
    references: [subcategories.id],
  }),
}));