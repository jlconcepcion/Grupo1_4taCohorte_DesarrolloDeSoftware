# Tests (`tests/` y `backend/tests/`)

Las suites de pruebas automatizadas del proyecto se ejecutan con **Jest + Supertest** dentro de `backend/tests/` y también en el pipeline de Integración Continua (`.github/workflows/ci.yml`):

## Suites de Pruebas Activas (`backend/tests/`)

| Archivo | Alcance | Historias / Subtareas |
| :--- | :--- | :--- |
| [health.test.js](../backend/tests/health.test.js) | Verificación de salud `GET /api/health` | `TR.02`, `TR.04` |
| [auth.test.js](../backend/tests/auth.test.js) | Registro (`201`, `400`, `409`), login (`200`, `401`) y protección de rutas | `HU01`, `HU02`, `ST01.03`, `ST01.04`, `ST01.08` |
| [usuarios.test.js](../backend/tests/usuarios.test.js) | Creación de usuarios e instructores por administrador y bloqueo `403` | `HU03`, `ST01.07`, `ST01.08` |
| [roles.test.js](../backend/tests/roles.test.js) | Unidad del middleware `requirePermiso` y matriz RBAC | `ST01.05` |
| [coordinador.test.js](../backend/tests/coordinador.test.js) | Verificación de permisos autorizados y denegados para el rol coordinador | `ST01.05`, `ST01.08` |
| [sprint2_recintos_horarios.test.js](../backend/tests/sprint2_recintos_horarios.test.js) | CRUD de recintos, clases en recintos activos, validación de horarios, rechazo de bloques solapados, auditoría de coordinador y bloqueo de eliminación con reservas activas | `HU04` – `HU09`, `ST02.01` – `ST02.11` |

## Ejecución

```bash
cd backend
npm test -- --runInBand
```
