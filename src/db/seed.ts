import { db } from './index'
import { categories, subcategories } from './schema'

const seed = async () => {
    // Clean up
    await db.delete(subcategories)
    await db.delete(categories)
    

    const insertedCategories = await db.insert(categories).values([
        { name: "Muebles" },
        { name: "Cocina" },
        { name: "Decoración" },
        { name: "Banos" },
        { name: "Dormitorios" },
        { name: "Sala de estar" },
        { name: "Jardines" },
    ]).returning()

    const [
        furniture,
        kitchen,
        decoration,
        bathroom,
        bedroom,
        livingroom,
        garden,
    ] = insertedCategories

    await db.insert(subcategories).values([
        { name: "Mesas", categoryId: furniture.id },
        { name: "Sillas", categoryId: furniture.id },
        { name: "Electrodomesticos", categoryId: kitchen.id },
        { name: "Floreros", categoryId: decoration.id },
        { name: "Lamparas", categoryId: decoration.id },
        { name: "Ba os", categoryId: bathroom.id },
        { name: "Camas", categoryId: bedroom.id },
        { name: "Sofas", categoryId: livingroom.id },
        { name: "Plantas", categoryId: garden.id },
    ]).returning()
}

seed().catch(console.error)