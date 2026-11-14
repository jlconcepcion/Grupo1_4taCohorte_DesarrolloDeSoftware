# Modelo de Datos en MongoDB y Arquitectura de Microservicios (`TR.03`)

**Proyecto:** Sistema de Reserva para Gimnasio y Canchas  
**Subtarea:** `TR.03` · Diseñar el modelo de datos completo (`usuarios`, `roles`, `recintos`, `clases`, `bloques_disponibilidad`, `reservas`, `sugerencias`) bajo un esquema de **Microservicios con MongoDB**.  
**Estado:** Revisado contra las historias de usuario `HU01` a `HU05`.

---

## 1. Arquitectura de Microservicios y Bases de Datos MongoDB

Cada épica del sistema está desacoplada en su propio microservicio de dominio siguiendo el patrón **Database-per-Service** sobre el clúster de MongoDB:

```mermaid
flowchart TB
    Client["Frontend Web Responsivo (Clientes, Instructores, Coordinador, Admin)"]
    Gateway["API Gateway (:3000)\nEnrutamiento, Sesiones JWT y Middleware RBAC (ST01.05)"]

    subgraph Microservicios["Capa de Microservicios de Dominio"]
        AuthSvc["auth-service (:3001)\nÉpica 1 · HU01"]
        SchedSvc["schedule-service (:3002)\nÉpica 2 · HU02"]
        ResSvc["reservations-service (:3003)\nÉpica 3 · HU03"]
        NotifSvc["notifications-service (:3004)\nÉpica 4 · HU04"]
        FeedSvc["feedback-service (:3005)\nÉpica 5 · HU05"]
    end

    subgraph MongoCluster["Clúster MongoDB (mongodb://127.0.0.1:27017)"]
        AuthDB[("gym_*_auth\n- roles\n- usuarios")]
        SchedDB[("gym_*_schedule\n- recintos\n- clases\n- bloques_disponibilidad")]
        ResDB[("gym_*_reservations\n- reservas")]
        NotifDB[("gym_*_notifications\n- notificaciones_log")]
        FeedDB[("gym_*_feedback\n- sugerencias")]
    end

    Client --> Gateway
    Gateway --> AuthSvc
    Gateway --> SchedSvc
    Gateway --> ResSvc
    Gateway --> NotifSvc
    Gateway --> FeedSvc

    AuthSvc --> AuthDB
    SchedSvc --> SchedDB
    ResSvc --> ResDB
    NotifSvc --> NotifDB
    FeedSvc --> FeedDB

    ResSvc -. "Valida bloques/recintos" .-> SchedSvc
    NotifSvc -. "Consulta reservas próximas y confirma tokens" .-> ResSvc
```

---

## 2. Diagrama Entidad-Relación de Colecciones MongoDB (`TR.03`)

Aunque cada microservicio gestiona su propia base de datos lógica en MongoDB, las colecciones mantienen integridad de dominio mediante referencias de `ObjectId` (`_id`) y validadores nativos `$jsonSchema`:

```mermaid
erDiagram
    ROLES ||--o{ USUARIOS : "rol (codigo)"
    USUARIOS ||--o{ CLASES : "instructor_id"
    RECINTOS ||--o{ CLASES : "recinto_id"
    USUARIOS ||--o{ BLOQUES_DISPONIBILIDAD : "instructor_id"
    USUARIOS |o--o{ BLOQUES_DISPONIBILIDAD : "actualizado_por_usuario_id"
    RECINTOS ||--o{ BLOQUES_DISPONIBILIDAD : "recinto_id"
    CLASES |o--o{ BLOQUES_DISPONIBILIDAD : "clase_id"
    USUARIOS ||--o{ RESERVAS : "cliente_id"
    USUARIOS |o--o{ RESERVAS : "gestionado_por_id"
    BLOQUES_DISPONIBILIDAD ||--o{ RESERVAS : "bloque_id"
    RECINTOS ||--o{ RESERVAS : "recinto_id"
    CLASES |o--o{ RESERVAS : "clase_id"
    RESERVAS ||--o{ NOTIFICACIONES_LOG : "referencia_id"
    USUARIOS ||--o{ SUGERENCIAS : "usuario_id"
    USUARIOS |o--o{ SUGERENCIAS : "revisado_por_id"
    RECINTOS ||--o{ SUGERENCIAS : "recinto_id"
    CLASES |o--o{ SUGERENCIAS : "clase_id"

    ROLES {
        ObjectId _id PK
        string codigo UK "cliente | coordinador | instructor | administrador"
        string nombre "Nombre del rol"
        array permisos "Lista de permisos RBAC (ST01.05)"
    }

    USUARIOS {
        ObjectId _id PK
        string nombre "Nombre completo"
        string correo UK "Índice único uk_usuarios_correo (ST01.01)"
        string password_hash "Hash bcrypt/argon2 (ST01.02)"
        string rol "Enum: cliente | coordinador | instructor | administrador"
        bool activo "Estado activo (ST01.01)"
        string creado_en "ISO-8601 timestamp"
        string actualizado_en "ISO-8601 timestamp"
    }

    RECINTOS {
        ObjectId _id PK
        string nombre UK "Índice único uk_recintos_nombre"
        string tipo "Enum: cancha | gimnasio (ST02.02)"
        string descripcion "Detalle opcional"
        int capacidad_maxima "Cupos por bloque (>= 1)"
        bool activo "true=activo, false=desactivado con historial (ST02.02)"
        string creado_en "ISO-8601 timestamp"
        string actualizado_en "ISO-8601 timestamp"
    }

    CLASES {
        ObjectId _id PK
        string nombre "Nombre de la clase"
        string tipo_rutina "Tipo de rutina (ST02.04)"
        string instructor_id FK "Requerido (ST02.01, ST02.04)"
        string recinto_id FK "Requerido en recinto activo (ST02.01, ST02.04)"
        int cupo_maximo "Capacidad de la clase (>= 1)"
        bool activa "Estado de la clase"
        string creado_en "ISO-8601 timestamp"
    }

    BLOQUES_DISPONIBILIDAD {
        ObjectId _id PK
        string instructor_id FK "Requerido (ST02.01)"
        string recinto_id FK "Requerido (ST02.01)"
        string clase_id FK "Opcional"
        int dia_semana "0=Dom .. 6=Sab (ST02.05)"
        string hora_inicio "HH:MM 24h (ST02.05)"
        string hora_fin "HH:MM 24h (> hora_inicio)"
        bool activo "Estado del bloque"
        string actualizado_por_usuario_id FK "Auditoría coordinador (ST02.09)"
        string creado_en "ISO-8601 timestamp"
        string actualizado_en "ISO-8601 timestamp"
    }

    RESERVAS {
        ObjectId _id PK
        string cliente_id FK "Requerido"
        string bloque_id FK "Requerido"
        string recinto_id FK "Requerido"
        string clase_id FK "Opcional"
        string fecha_reserva "YYYY-MM-DD (ST03.02)"
        int cupo_numero "Número de cupo (>= 1)"
        string estado "Enum: pendiente | confirmada | cancelada (ST03.01)"
        bool recordatorio_enviado "Control de envío único (ST04.03)"
        string recordatorio_enviado_en "Timestamp opcional"
        string token_confirmacion "Token firmado de un solo uso (ST04.04)"
        string token_expira_en "Expiración del token (ST04.04)"
        string token_usado_en "Marca de uso del token (ST04.04)"
        string gestionado_por_id FK "Coordinador/Admin (ST03.08, ST03.10)"
        string fecha_gestion "Timestamp de gestión"
        string creado_en "ISO-8601 timestamp (ST03.01)"
        string actualizado_en "ISO-8601 timestamp"
    }

    NOTIFICACIONES_LOG {
        ObjectId _id PK
        string tipo "recordatorio_cliente | resumen_instructor | reporte_csv"
        string destinatario_correo "Correo destino"
        string referencia_id FK "ID de reserva o clase"
        string enviado_en "ISO-8601 timestamp"
        string estado_envio "enviado | fallido"
    }

    SUGERENCIAS {
        ObjectId _id PK
        string usuario_id FK "Requerido (ST05.01)"
        string recinto_id FK "Requerido (ST05.01)"
        string clase_id FK "Opcional (ST05.01)"
        string categoria "instalaciones | instructor | horarios | limpieza | atencion | otro"
        string texto "minLength: 1, maxLength: 500 (ST05.01, ST05.03)"
        string estado "Enum: nueva | revisada (ST05.01)"
        string revisado_por_id FK "Coordinador que revisó (ST05.04)"
        string creado_en "ISO-8601 timestamp"
        string revisado_en "ISO-8601 timestamp"
    }
```

---

## 3. Reglas de Integridad en MongoDB (`$jsonSchema` e Índices)

Todas las reglas están implementadas en [001_mongodb_schemas_and_indexes.js](../database/migrations/001_mongodb_schemas_and_indexes.js):

1. **Correo único de usuario (`ST01.01`):**
   - Índice único `{ correo: 1 }` (`unique: true`) en `gym_*_auth.usuarios`, rechazando correos duplicados con error `E11000 duplicate key error` a nivel de base de datos.
2. **Bloques con instructor y recinto obligatorios (`ST02.01`):**
   - Validador `$jsonSchema` en `gym_*_schedule.bloques_disponibilidad` con `required: ['instructor_id', 'recinto_id', 'dia_semana', 'hora_inicio', 'hora_fin', 'activo', 'creado_en']`.
3. **Estados de reserva restringidos (`ST03.01`):**
   - Validador `$jsonSchema` en `gym_*_reservations.reservas` con `enum: ['pendiente', 'confirmada', 'cancelada']`. Cualquier otro estado es rechazado con error `Document failed validation (code 121)`.
4. **Restricción única contra reservas duplicadas sobre el mismo cupo y fecha (`ST03.02`):**
   - Índice único con expresión de filtro parcial (`partialFilterExpression`) en MongoDB:
     ```javascript
     db.collection('reservas').createIndex(
       { bloque_id: 1, fecha_reserva: 1, cupo_numero: 1 },
       {
         unique: true,
         name: 'uk_reserva_cupo_fecha_activa',
         partialFilterExpression: {
           estado: { $in: ['pendiente', 'confirmada'] }
         }
       }
     );
     ```
   - Permite conservar el historial de reservas con `estado: 'cancelada'` (`ST03.06`) mientras impide a nivel de base de datos insertar una segunda reserva activa para el mismo bloque, fecha y cupo.
5. **Límite de caracteres y estados en sugerencias (`ST05.01`, `ST05.03`):**
   - Validador `$jsonSchema` en `gym_*_feedback.sugerencias` con `texto: { bsonType: 'string', minLength: 1, maxLength: 500 }` y `estado: { enum: ['nueva', 'revisada'] }`.

---

## 4. Matriz de Trazabilidad por Microservicio (`HU01` – `HU05`)

| Historia | Microservicio Responsable | Base de Datos MongoDB | Colecciones | Subtareas Cubiertas |
| :--- | :--- | :--- | :--- | :--- |
| **`HU01`** | `auth-service` (`:3001`) | `gym_*_auth` | `roles`, `usuarios` | `ST01.01` – `ST01.08` |
| **`HU02`** | `schedule-service` (`:3002`) | `gym_*_schedule` | `recintos`, `clases`, `bloques_disponibilidad` | `ST02.01` – `ST02.11` |
| **`HU03`** | `reservations-service` (`:3003`) | `gym_*_reservations` | `reservas` | `ST03.01` – `ST03.11` |
| **`HU04`** | `notifications-service` (`:3004`) | `gym_*_notifications` | `notificaciones_log` (+ `reservas`) | `ST04.01` – `ST04.08` |
| **`HU05`** | `feedback-service` (`:3005`) | `gym_*_feedback` | `sugerencias` | `ST05.01` – `ST05.07` |
