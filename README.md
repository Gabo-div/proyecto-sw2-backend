# Api de Modelos

Este repositorio contiene el backend de una API RESTful construida con un stack moderno de TypeScript, diseñada para ser rápida, segura y escalable. La API gestiona un catálogo de modelos 3D, organizados por categorías y subcategorías.

## ✨ Características Principales

-   **Framework Ultrarrápido:** Construido con **[Hono](https://hono.dev/)**, un framework web ligero y extremadamente rápido ideal para cualquier entorno de JavaScript.
-   **ORM Moderno:** Utiliza **[Drizzle ORM](https://orm.drizzle.team/)** para interactuar con la base de datos de una manera segura, intuitiva y totalmente tipada, escribiendo TypeScript en lugar de SQL puro.
-   **Base de Datos Distribuida:** Conectado a **[Turso](https://turso.tech/)**, una base de datos distribuida basada en libSQL (un fork de SQLite), optimizada para baja latencia global.
-   **Totalmente en TypeScript:** Código 100% TypeScript de principio a fin, garantizando seguridad de tipos y una mejor experiencia de desarrollo.
-   **Gestión de Modelos 3D:** Incluye endpoints para sincronizar archivos `.glb` locales, obtener metadatos y servir los archivos directamente.

## 🚀 Puesta en Marcha (Getting Started)

Sigue estos pasos para configurar y ejecutar el proyecto en tu entorno de desarrollo local.

### 1. Prerrequisitos

Asegúrate de tener instalado lo siguiente:
-   [Node.js](https://nodejs.org/) (se recomienda la versión LTS, 18.x o superior)
-   [pnpm](https://pnpm.io/installation) (o puedes usar `npm` o `yarn`)

### 2. Clonar el Repositorio

```bash
git clone https://github.com/tu-usuario/tu-repositorio.git
cd tu-repositorio
```

### 3. Instalar Dependencias

Instala todas las dependencias del proyecto.
```bash
pnpm install
```

### 4. Configurar Variables de Entorno

Este proyecto requiere credenciales para conectarse a la base de datos de Turso.

1.  **Crea tu archivo `.env`:**
    Copia el archivo de ejemplo para crear tu propio archivo de configuración local.
    ```bash
    cp .env.example .env
    ```

2.  **Edita el archivo `.env`:**
    Abre el nuevo archivo `.env` y rellena las variables con tus propias credenciales de Turso.

    ```env
    # URL de conexión a tu base de datos Turso (ej: libsql://tu-db-nombre.turso.io)
    DATABASE_URL="..."

    # Token de autenticación para tu base de datos Turso
    DATABASE_TOKEN="..."
    ```
    > **Nota:** Puedes obtener estas credenciales usando la [CLI de Turso](https://docs.turso.tech/cli/instrucciones-de-instalacion) con los comandos `turso db show <db-name>` y `turso db tokens create <db-name>`.

### 5. Sincronizar la Base de Datos con el Esquema (Migraciones)

Drizzle necesita aplicar el esquema definido en `src/db/schema.ts` a tu base de datos Turso.

*Si aún no lo has hecho, ejecuta el siguiente comando para generar y aplicar las migraciones:*
```bash
pnpm run db:push
```
> Este comando leerá tu esquema y lo creará en la base de datos remota. Solo necesitas ejecutarlo cuando hagas cambios en `schema.ts`.

### 6. Ejecutar el Servidor de Desarrollo

Ahora puedes iniciar el servidor. Se ejecutará en modo de desarrollo con recarga automática (`hot-reloading`).

```bash
pnpm run dev
# o si usas npm
# npm run dev
```

Una vez ejecutado, verás un mensaje en la consola indicando que el servidor está corriendo:
```
Server is running on http://localhost:3000
```

## Endpoints de la API

La API se sirve bajo el puerto `3000`. Aquí tienes un resumen de los endpoints disponibles:

| Método | Ruta                      | Descripción                                                |
| :----- | :------------------------ | :--------------------------------------------------------- |
| `GET`  | `/health`                 | Verifica el estado de la conexión con la base de datos.    |
| `GET`  | `/models`                 | Obtiene una lista de todos los modelos con sus relaciones. |
| `GET`  | `/models/:id`             | Obtiene los metadatos (JSON) de un modelo específico.      |
| `GET`  | `/models/file/:id`        | Sirve el archivo `.glb` físico de un modelo específico.    |
| `POST` | `/models/sync-from-assets`| Sincroniza los archivos `.glb` locales con la base de datos.|

### Ejemplo de uso con `curl`
```bash
# Obtener todos los modelos
curl.exe http://localhost:3000/models/

# Obtener el modelo con id 1
curl.exe http://localhost:3000/models/1
```

## Estructura del Proyecto

```
.
├── src/
│   ├── assets/         # Archivos estáticos como modelos .glb
|   |   ├──models/ 
│   ├── db/
│   │   ├── index.ts    # Configuración del cliente Drizzle y conexión
│   │   └── schema.ts   # Definición de tablas y relaciones de la BD
│   ├── routes/         # Definición de rutas (endpoints)
│   │   └── models.ts
│   ├── env.ts          # Validación de variables de entorno (opcional)
│   └── index.ts        # Punto de entrada del servidor Hono
├── .env.example        # Archivo de ejemplo para variables de entorno
├── package.json
└── tsconfig.json
```
