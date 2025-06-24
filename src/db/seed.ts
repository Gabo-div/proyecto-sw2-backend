import { db } from './index'
import { categories, subcategories } from './schema'

const seed = async () => {
    // Clean up
    await db.delete(categories)
    await db.delete(subcategories)

    const insertedCategories = await db.insert(categories).values([
        { name: "Muebles" },
        { name: "Cocina" },
        { name: "Decoración" },
    ]).returning()

    const [furniture, kitchen, decoration] = insertedCategories

    await db.insert(subcategories).values([
        { name: "Mesas", categoryId: furniture.id },
        { name: "Sillas", categoryId: furniture.id },
        { name: "Electrodomesticos", categoryId: kitchen.id },
        { name: "Floreros", categoryId: decoration.id },
        { name: "Lamparas", categoryId: decoration.id },
    ]).returning()
}

seed().catch(console.error)