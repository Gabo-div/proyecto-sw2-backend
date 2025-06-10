import { int, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

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
    subcategoryId: int().references(() => categories.id),
  },
  (table) => [primaryKey({ columns: [table.modelId, table.subcategoryId] })],
);
