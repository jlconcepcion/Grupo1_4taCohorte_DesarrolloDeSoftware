# Modelo Entidad-Relación y Arquitectura de Datos (`TR.03`)

**Proyecto:** Sistema de Reserva para Gimnasio y Canchas  
**Subtarea:** `TR.03` · Diseñar el modelo entidad-relación completo (`usuarios`, `roles`, `recintos`, `clases`, `bloques_disponibilidad`, `reservas`, `sugerencias`).  
**Stack Oficial del Proyecto:**
- **Frontend (`frontend/`):** React 18 + Vite 6 + Tailwind CSS v4 (Nginx en puerto `8080` / Vite en `5173`).
- **Backend (`backend/`):** Node.js + Express 5 + Mongoose 9 + JWT + `bcryptjs` (API REST en puerto `3000`).
- **Base de Datos (`mongo`):** MongoDB 7 (`mongodb://mongo:27017/reservas_gimnasio`).

---

## 1. Diagrama de Arquitectura de Contenedores y Módulos

```mermaid
flowchart TB
    Browser["Navegador Web / Móvil (360px+)"]

    subgraph DockerCompose["Entorno Docker Compose (TR.02)"]
        Frontend["Contenedor frontend (:8080)\nReact 18 + Vite 6 + Tailwind CSS v4\n(Landing, Login, Registro, Dashboard)"]
        Backend["Contenedor backend (:3000)\nNode.js + Express 5 + Mongoose 9\nMiddlewares: autenticar (JWT) + requirePermiso (RBAC)"]
        Mongo[("Contenedor mongo (:27017)\nMongoDB 7 · BD: reservas_gimnasio")]
    end

    Browser --> Frontend
    Frontend -- "API REST (/api/*)" --> Backend
    Backend -- "Mongoose ODM" --> Mongo
```

---

## 2. Diagrama Entidad-Relación de Modelos Mongoose / MongoDB (`TR.03`)

El modelo de datos cubre íntegramente las historias de usuario **`HU01` a `HU05`** mediante colecciones en MongoDB (`reservas_gimnasio`) con referencias `ObjectId` y validaciones tanto en Mongoose como a nivel de índices de base de datos:

```mermaid
erDiagram
    ROLES ||--o{ USERS : "rol (enum)"
    USERS ||--o{ CLASES : "instructor (ObjectId)"
    RECINTOS ||--o{ CLASES : "recinto (ObjectId)"
    USERS ||--o{ BLOQUES_DISPONIBILIDAD : "instructor (ObjectId)"
    USERS |o--o{ BLOQUES_DISPONIBILIDAD : "modificadoPor (ObjectId)"
    RECINTOS ||--o{ BLOQUES_DISPONIBILIDAD : "recinto (ObjectId)"
    CLASES |o--o{ BLOQUES_DISPONIBILIDAD : "clase (ObjectId)"
    USERS ||--o{ RESERVAS : "cliente (ObjectId)"
    USERS |o--o{ RESERVAS : "gestionadoPor (ObjectId)"
    BLOQUES_DISPONIBILIDAD ||--o{ RESERVAS : "bloque (ObjectId)"
    RECINTOS ||--o{ RESERVAS : "recinto (ObjectId)"
    CLASES |o--o{ RESERVAS : "clase (ObjectId)"
    USERS ||--o{ SUGERENCIAS : "usuario (ObjectId)"
    USERS |o--o{ SUGERENCIAS : "revisadoPor (ObjectId)"
    RECINTOS ||--o{ SUGERENCIAS : "recinto (ObjectId)"
    CLASES |o--o{ SUGERENCIAS : "clase (ObjectId)"

    ROLES {
        string codigo PK "cliente | coordinador | instructor | administrador"
        array acciones "Permisos definidos en backend/src/config/permisos.js"
    }

    USERS {
        ObjectId _id PK
        string correo UK "required, unique, lowercase, trim (ST01.01)"
        string password "Hash bcryptjs (pre-save hook, oculto en toJSON) (ST01.02)"
        string rol "enum: cliente | coordinador | instructor | administrador (ST01.01, ST01.05)"
        boolean activo "default: true (ST01.01)"
        Date createdAt "timestamps: true (ST01.01)"
        Date updatedAt "timestamps: true"
    }

    RECINTOS {
        ObjectId _id PK
        string nombre UK "required, unique, trim (ST02.02)"
        string tipo "enum: cancha | gimnasio (ST02.02)"
        string descripcion "Detalle opcional del recinto"
        number capacidad "default: 1, min: 1"
        boolean activo "default: true (desactivación sin perder historial - ST02.02)"
        Date createdAt "timestamps: true"
        Date updatedAt "timestamps: true"
    }

    CLASES {
        ObjectId _id PK
        string nombre "required, trim (ST02.04)"
        string tipoRutina "required, trim (ST02.04)"
        ObjectId instructor FK "ref: User, required (ST02.01, ST02.04)"
        ObjectId recinto FK "ref: Recinto, required (solo recintos activos - ST02.01, ST02.04)"
        number cupoMaximo "default: 15, min: 1"
        boolean activa "default: true"
        Date createdAt "timestamps: true"
        Date updatedAt "timestamps: true"
    }

    BLOQUES_DISPONIBILIDAD {
        ObjectId _id PK
        ObjectId instructor FK "ref: User, required (ST02.01)"
        ObjectId recinto FK "ref: Recinto, required (ST02.01)"
        ObjectId clase FK "ref: Clase, opcional"
        number diaSemana "0=Dom .. 6=Sab, required (ST02.05)"
        string horaInicio "HH:MM (24h), required (ST02.05)"
        string horaFin "HH:MM (24h), required, > horaInicio (ST02.05)"
        ObjectId modificadoPor FK "ref: User (auditoría coordinador - ST02.09)"
        Date createdAt "timestamps: true"
        Date updatedAt "timestamps: true (fecha de cambio - ST02.09)"
    }

    RESERVAS {
        ObjectId _id PK
        ObjectId cliente FK "ref: User, required (ST03.01)"
        ObjectId bloque FK "ref: BloqueDisponibilidad, required (ST03.01)"
        ObjectId recinto FK "ref: Recinto, required"
        ObjectId clase FK "ref: Clase, opcional"
        string fecha "YYYY-MM-DD, required (ST03.02)"
        number cupoNumero "default: 1, min: 1 (ST03.02)"
        string estado "enum: pendiente | confirmada | cancelada (ST03.01)"
        boolean recordatorioEnviado "default: false (ST04.03)"
        string tokenConfirmacion "Token firmado de un solo uso (ST04.04)"
        Date tokenExpiraEn "Caducidad del enlace (ST04.04)"
        Date tokenUsadoEn "Marca de uso único (ST04.04)"
        ObjectId gestionadoPor FK "ref: User (coordinador/admin - ST03.08, ST03.10)"
        Date fechaGestion "Fecha de confirmación/cancelación (ST03.08)"
        Date createdAt "timestamps: true (ST03.01)"
        Date updatedAt "timestamps: true"
    }

    SUGERENCIAS {
        ObjectId _id PK
        ObjectId usuario FK "ref: User, required (ST05.01)"
        ObjectId recinto FK "ref: Recinto, required (ST05.01)"
        ObjectId clase FK "ref: Clase, opcional (ST05.01)"
        string categoria "enum: instalaciones | instructor | horarios | limpieza | atencion | otro"
        string texto "required, trim, minlength: 1, maxlength: 500 (ST05.01, ST05.03)"
        string estado "enum: nueva | revisada, default: nueva (ST05.01, ST05.04)"
        ObjectId revisadoPor FK "ref: User, opcional (ST05.04)"
        Date createdAt "timestamps: true (ST05.01)"
        Date updatedAt "timestamps: true"
    }
```

---

## 3. Reglas de Integridad y Restricciones por Historia (`HU01` – `HU05`)

### 3.1. Épica 1 · Autenticación y Usuarios (`HU01`)
- **Modelo implementado:** [backend/src/models/User.js](../backend/src/models/User.js) y matriz RBAC en [backend/src/config/permisos.js](../backend/src/config/permisos.js).
- **`ST01.01`:** Correo único (`unique: true, lowercase: true, trim: true`), rol restringido a `['cliente', 'coordinador', 'instructor', 'administrador']`, estado `activo: Boolean` y fechas automáticas (`timestamps: true`).
- **`ST01.02`:** Cifrado con `bcryptjs` en hook `pre('save')` y eliminación automática de `password` en `toJSON`.

### 3.2. Épica 2 · Gestión de Recintos y Horarios (`HU02`)
- **`ST02.01`:** `BloqueDisponibilidad` exige referencias obligatorias `instructor` (`ref: 'User'`, `required: true`) y `recinto` (`ref: 'Recinto'`, `required: true`).
- **`ST02.02`:** `Recinto` utiliza borrado lógico (`activo: Boolean, default: true`) para que al desactivarse deje de aparecer en consultas de clientes sin perder el historial de reservas ni sugerencias.
- **`ST02.05` y `ST02.06`:** Validación de `horaFin > horaInicio` y verificación en controlador/modelo para impedir que un mismo `instructor` registre bloques que se solapen en el mismo `diaSemana`.
- **`ST02.07`:** Antes de eliminar un `BloqueDisponibilidad`, se verifica en `Reserva` que no existan reservas con `estado: { $in: ['pendiente', 'confirmada'] }`.
- **`ST02.09`:** `modificadoPor` (`ref: 'User'`) y `updatedAt` registran los cambios realizados por el coordinador.

### 3.3. Épica 3 · Reservas (`HU03`)
- **`ST03.01`:** Campo `estado` restringido por `enum: ['pendiente', 'confirmada', 'cancelada']` con valor inicial `'pendiente'`.
- **`ST03.02` (Restricción única contra reservas duplicadas):**
  Índice único parcial en MongoDB/Mongoose sobre reservas activas:
  ```javascript
  reservaSchema.index(
    { bloque: 1, fecha: 1, cupoNumero: 1 },
    {
      unique: true,
      partialFilterExpression: { estado: { $in: ['pendiente', 'confirmada'] } }
    }
  );
  ```
  Esto rechaza a nivel de base de datos (`code: 11000`) cualquier intento de duplicar una reserva activa sobre el mismo cupo y fecha, pero permite volver a reservar ese horario si la reserva previa pasa a `'cancelada'` (`ST03.06`).

### 3.4. Épica 4 · Notificaciones y Reportes (`HU04`)
- **`ST04.03`:** Booleano `recordatorioEnviado: { type: Boolean, default: false }` en `Reserva` para garantizar que el job programado (`ST04.02`) envíe como máximo un recordatorio por reserva.
- **`ST04.04`:** Campos `tokenConfirmacion`, `tokenExpiraEn` y `tokenUsadoEn` para validar enlaces de confirmación firmados, con caducidad y de un solo uso.

### 3.5. Épica 5 · Sugerencias e Indicadores (`HU05`)
- **`ST05.01` y `ST05.03`:** Colección `Sugerencia` con `usuario` (`required`), `recinto` (`required`), `clase` (opcional), `categoria`, `texto` (`required, minlength: 1, maxlength: 500`) y `estado` (`enum: ['nueva', 'revisada'], default: 'nueva'`).
- **`ST05.05`:** Índices sobre `{ recinto: 1, categoria: 1, createdAt: 1 }` y `{ clase: 1, createdAt: 1 }` para agregaciones rápidas (`Reserva.aggregate` / `Sugerencia.aggregate`) en el panel de indicadores del administrador.

---

## 4. Matriz de Trazabilidad del Modelo E-R (`HU01` – `HU05`)

| Historia | Subtareas Cubiertas | Modelos Mongoose / Colecciones MongoDB |
| :--- | :--- | :--- |
| **`HU01`** | `ST01.01`, `ST01.02`, `ST01.03`, `ST01.05`, `ST01.07` | `User` (`users`), `PERMISOS` (`config/permisos.js`) |
| **`HU02`** | `ST02.01`, `ST02.02`, `ST02.04`, `ST02.05`, `ST02.06`, `ST02.07`, `ST02.09` | `Recinto` (`recintos`), `Clase` (`clases`), `BloqueDisponibilidad` (`bloques`) |
| **`HU03`** | `ST03.01`, `ST03.02`, `ST03.03`, `ST03.05`, `ST03.06`, `ST03.08`, `ST03.10` | `Reserva` (`reservas`), `BloqueDisponibilidad`, `Recinto` |
| **`HU04`** | `ST04.02`, `ST04.03`, `ST04.04`, `ST04.06`, `ST04.07` | `Reserva` (`recordatorioEnviado`, `tokenConfirmacion`, `tokenExpiraEn`, `tokenUsadoEn`) |
| **`HU05`** | `ST05.01`, `ST05.03`, `ST05.04`, `ST05.05` | `Sugerencia` (`sugerencias`) |
