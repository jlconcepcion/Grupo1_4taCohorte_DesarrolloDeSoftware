# Catálogo Completo de Endpoints de la API REST (`Sprints 1, 2 y 3`)

**URL Base del Backend (directo):** `http://localhost:3000/api`  
**URL Base vía Proxy del Frontend:** `http://localhost:8080/api`  
**Autenticación:** Encabezado `Authorization: Bearer <token_jwt>` en todas las rutas protegidas.

---

## Ubicación de los Archivos de las APIs en el Proyecto

1. **Cliente HTTP del Frontend (React):**
   - `frontend/src/api.js`
2. **Punto de entrada de rutas del Backend (Express):**
   - `backend/src/app.js`
3. **Definición de rutas (`backend/src/routes/`):**
   - `backend/src/routes/auth.routes.js`
   - `backend/src/routes/usuarios.routes.js`
   - `backend/src/routes/recintos.routes.js`
   - `backend/src/routes/clases.routes.js`
   - `backend/src/routes/bloques.routes.js`
   - `backend/src/routes/reservas.routes.js`
4. **Controladores (`backend/src/controllers/`):**
   - `backend/src/controllers/auth.controller.js`
   - `backend/src/controllers/usuarios.controller.js`
   - `backend/src/controllers/recintos.controller.js`
   - `backend/src/controllers/clases.controller.js`
   - `backend/src/controllers/bloques.controller.js`
   - `backend/src/controllers/reservas.controller.js`

---

## 1. Salud del Servidor

### `GET /api/health`
- **Acceso:** Público
- **Respuesta (`200 OK`):**
  ```json
  { "status": "ok" }
  ```

---

## 2. Épica 1 · Autenticación y Usuarios (`HU01` – `HU03`)

### `POST /api/auth/registro` (`HU01`)
- **Acceso:** Público (crea cuenta activa con rol `cliente`)
- **Body JSON:**
  ```json
  {
    "correo": "carla@correo.com",
    "password": "MiPassword123"
  }
  ```
- **Respuestas:** `201 Created` (`{ usuario, token }`), `400 Bad Request`, `409 Conflict` (correo duplicado).

### `POST /api/auth/login` (`HU02`)
- **Acceso:** Público
- **Body JSON:**
  ```json
  {
    "correo": "cliente@gym.com",
    "password": "Cliente12345"
  }
  ```
- **Respuestas:** `200 OK` (`{ usuario, token }`), `401 Unauthorized` (`"Credenciales incorrectas"`).

### `GET /api/auth/perfil` (`HU02`)
- **Acceso:** Cualquier usuario autenticado
- **Respuestas:** `200 OK` (`{ _id, correo, rol, activo }`), `401 Unauthorized`.

### `GET /api/usuarios` y `POST /api/usuarios` (`HU03`)
- **Acceso:** Exclusivo `administrador` (`403 Forbidden` para otros roles)
- **Body JSON (`POST`):**
  ```json
  {
    "correo": "pedro@gym.com",
    "password": "Instructor123",
    "rol": "instructor"
  }
  ```
- **Respuestas:** `201 Created`, `400 Bad Request`, `403 Forbidden`, `409 Conflict`.

---

## 3. Épica 2 · Recintos, Clases y Bloques de Disponibilidad (`HU04` – `HU09`)

### `GET /api/recintos` (`HU04`, `HU05`)
- **Acceso:** Todos los roles autenticados (los clientes reciben únicamente recintos con `activo: true`).

### `POST /api/recintos` (`HU04`)
- **Acceso:** Exclusivo `administrador`
- **Body JSON:**
  ```json
  {
    "nombre": "Cancha 1",
    "tipo": "Fútbol 5",
    "capacidad": 10,
    "descripcion": "Cancha sintética techada"
  }
  ```
- **Respuestas:** `201 Created`, `400 Bad Request`, `403 Forbidden`, `409 Conflict`.

### `PUT /api/recintos/:id` y `PATCH /api/recintos/:id` (`HU05`)
- **Acceso:** Exclusivo `administrador`
- **Body JSON:**
  ```json
  {
    "nombre": "Cancha 1",
    "tipo": "Fútbol 5",
    "capacidad": 12,
    "activo": false
  }
  ```

### `GET /api/clases`, `POST /api/clases` y `PUT /api/clases/:id` (`HU06`)
- **Acceso:** `GET` (todos los roles autenticados); `POST` y `PUT` (exclusivo `instructor` sobre sus propias clases y en recintos activos).
- **Body JSON (`POST`):**
  ```json
  {
    "nombre": "Entrenamiento Funcional",
    "tipoRutina": "Fuerza y resistencia",
    "recinto": "<id_recinto_activo>"
  }
  ```

### `GET /api/bloques`, `POST /api/bloques`, `PUT /api/bloques/:id` y `DELETE /api/bloques/:id` (`HU07` – `HU09`)
- **Acceso:**
  - `GET`: Todos los roles autenticados.
  - `POST`: `instructor` (valida `horaFin > horaInicio` y que no exista solapamiento en el mismo día).
  - `PUT / DELETE`: `instructor` (bloques propios), `coordinador` y `administrador` (cualquier bloque, registrando auditoría `modificadoPor` y `fechaModificacion`, y bloqueando eliminación si tiene reservas activas).
  - `POST` y `PUT`: la `capacidad` del bloque debe ser `> 0`, no superar la `capacidad` del recinto ni quedar por debajo de las reservas activas.
- **Body JSON (`POST`):**
  ```json
  {
    "clase": "<id_clase>",
    "recinto": "<id_recinto>",
    "diaSemana": 2,
    "horaInicio": "16:00",
    "horaFin": "18:00",
    "capacidad": 12
  }
  ```

---

## 4. Épica 3 · Reservas (`HU10` – `HU17` · Sprint 3)

### `GET /api/reservas/disponibilidad` (`HU10`, `ST03.03`)
- **Acceso:** Todos los roles autenticados
- **Query params opcionales:** `?fecha=2026-11-24&recinto=<id>&clase=<id>&instructor=<id>`
- **Comportamiento:** Devuelve únicamente bloques en recintos activos con `cuposLibres > 0`. `fecha` debe ser `YYYY-MM-DD` futura o de hoy; los filtros por `clase` e `instructor` están soportados.

### `POST /api/reservas` (`HU11`, `ST03.05`)
- **Acceso:** Exclusivo `cliente`
- **Body JSON:**
  ```json
  {
    "bloqueId": "<id_bloque>",
    "fecha": "2026-11-24"
  }
  ```
- **Respuestas:** `201 Created` (nace en `estado: "pendiente"`), `400 Bad Request` (fecha inválida/pasada o día distinto al del bloque), `409 Conflict` (bloque lleno o reserva activa duplicada).
- **Concurrencia:** validación y escritura protegidas por bloqueo por `bloqueId + fecha` y transacción en Atlas / replica set (`mongodb+srv://` o `replicaSet=`); en standalone se usa el bloqueo en proceso.

### `GET /api/reservas/mias` (`HU13`)
- **Acceso:** Exclusivo `cliente`
- **Query param opcional:** `?tipo=proximas` | `?tipo=pasadas` | `?tipo=todas`

### `PATCH /api/reservas/:id/confirmar-asistencia` (`HU14`)
- **Acceso:** `cliente` propietario de la reserva (hasta 1 hora antes del inicio del bloque; idempotente).

### `PATCH /api/reservas/:id/cancelar-propia` (`HU12`, `ST03.06`)
- **Acceso:** `cliente` propietario de la reserva (antes del inicio del bloque; pasa a `cancelada`, conserva historial y libera el cupo).

### `GET /api/reservas` (`HU15`, `ST03.07`)
- **Acceso:** `coordinador` y `administrador`
- **Query params opcionales:** `?fecha=YYYY-MM-DD&recinto=<id>&clase=<id>&instructor=<id>&estado=pendiente|confirmada|cancelada`
- **Validación:** `fecha` debe ser futura o de hoy y `estado` debe pertenecer a los tres valores permitidos.

### `PATCH /api/reservas/:id/confirmar` (`HU16`, `ST03.08`)
- **Acceso:** `coordinador` y `administrador` (confirma una reserva pendiente y registra `gestionadoPor` y `fechaConfirmacion`; si ya está confirmada responde `200` sin duplicar cambios).

### `PATCH /api/reservas/:id/cancelar` (`HU17`, `ST03.08`)
- **Acceso:** `coordinador` y `administrador`
- **Body JSON opcional:**
  ```json
  { "motivo": "Cliente no confirmó asistencia 1 hora antes" }
  ```

### `PATCH /api/reservas/:id/reasignar` (`ST03.10`)
- **Acceso:** Exclusivo `administrador`
- **Body JSON:**
  ```json
  {
    "nuevoBloqueId": "<id_bloque_destino>",
    "nuevaFecha": "2026-11-26",
    "nuevoClienteId": "<id_cliente_destino_opcional>"
  }
  ```
- **Validación:** comprueba día de la semana, capacidad, recinto/clase activos, cliente destino activo y duplicados; registra `historialCambios` y sincroniza contadores de ambos bloques.

### `GET /api/reservas/conteo-instructor` (`ST03.09`)
- **Acceso:** `instructor`, `coordinador` y `administrador`
- **Query param opcional:** `?fecha=YYYY-MM-DD` (futura o de hoy).
- **Respuesta:** Lista de bloques con `totalReservadas`, `confirmadas`, `pendientes`, `canceladas`, `cuposLibres` y `fechaFiltro`.
