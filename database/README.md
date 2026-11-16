# Database (`database/`)

Directorio para los artefactos de base de datos **MongoDB (`reservas_gimnasio`)**:

- `migrations/`:
  - [001_mongodb_schemas_and_indexes.js](./migrations/001_mongodb_schemas_and_indexes.js): Especificación de validadores `$jsonSchema` e índices únicos/parciales de las colecciones (`users`, `recintos`, `clases`, `bloques`, `reservas`, `sugerencias`), alineada con el modelo entidad-relación (`TR.03`) y los modelos Mongoose en `backend/src/models/`.
- `seeds/`:
  - La carga ejecutable de datos semilla (usuarios de los 4 roles, recintos iniciales, clases y bloques de disponibilidad) se ejecuta mediante `backend/src/scripts/seed.js` (`npm run seed` en `backend/` o `docker compose exec backend npm run seed`).
