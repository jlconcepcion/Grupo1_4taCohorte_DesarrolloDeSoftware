# Tests (`tests/` y `backend/tests/`)

Las suites de pruebas automatizadas del proyecto se ejecutan con **Jest + Supertest** dentro de `backend/tests/` y también en el pipeline de Integración Continua (`.github/workflows/ci.yml`):

## Suites de Pruebas Activas (`backend/tests/`)

| Archivo | Alcance | Historias / Subtareas |
| :--- | :--- | :--- |
| [health.test.js](../backend/tests/health.test.js) | Verificación de salud `GET /api/health` | `TR.02`, `TR.04` |
| [auth.test.js](../backend/tests/auth.test.js) | Registro (`201`, `400`, `409`), nombre de usuario opcional, login (`200`, `401`) y protección de rutas | `HU01`, `HU02`, `ST01.03`, `ST01.04`, `ST01.08`, `ST04.16` |
| [usuarios.test.js](../backend/tests/usuarios.test.js) | Creación por administrador, edición self/admin, borrado de nombre, validación y bloqueo `403` | `HU03`, `ST01.07`, `ST01.08`, `ST04.16` |
| [roles.test.js](../backend/tests/roles.test.js) | Unidad del middleware `requirePermiso` y matriz RBAC | `ST01.05` |
| [coordinador.test.js](../backend/tests/coordinador.test.js) | Verificación de permisos autorizados y denegados para el rol coordinador | `ST01.05`, `ST01.08` |
| [sprint2_recintos_horarios.test.js](../backend/tests/sprint2_recintos_horarios.test.js) | CRUD de recintos, clases en recintos activos, validación de horarios, rechazo de bloques solapados, auditoría de coordinador y bloqueo de eliminación con reservas activas | `HU04` – `HU09`, `ST02.01` – `ST02.11` |
| [sprint3_reservas.test.js](../backend/tests/sprint3_reservas.test.js) | Disponibilidad, fechas inválidas/pasadas, RBAC, reserva con control de concurrencia, confirmación/cancelación, idempotencia, reasignación con cliente destino, flujo E2E y detalle de clientes con nombre o correo | `HU10` – `HU17`, `ST03.01` – `ST03.11`, `ST04.16` |
| [sprint4_notificaciones.test.js](../backend/tests/sprint4_notificaciones.test.js) | Envío multi-canal con fallo parcial, idempotencia, token público de asistencia, auditoría, reenvío, resumen del instructor y notificación de navegación al crear usuario | `HU04`, `ST04.01` – `ST04.06`, `ST04.09` – `ST04.14` |
| [sprint4_reportes.test.js](../backend/tests/sprint4_reportes.test.js) | Exportación CSV con filtros, validación de estado y RBAC del reporte | `ST04.07` |
| [sprint4_preferencias.test.js](../backend/tests/sprint4_preferencias.test.js) | Preferencias por usuario, canales activos, anticipación, TTL del token, APIs self/admin y RBAC | `ST04.15` |

**Total vigente:** 10 suites / 96 pruebas. Las pruebas usan mocks; no requieren MongoDB Atlas.

## Ejecución

```bash
cd backend
npm test -- --runInBand
```
