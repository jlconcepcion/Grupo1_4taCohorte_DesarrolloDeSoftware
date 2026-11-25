# Sistema de Reserva para Gimnasio y Canchas

**Proyecto Final · Metodologías Ágiles con Scrum**  
**Grupo 1 · 4ta Cohorte de Desarrollo de Software**

Aplicación web para la gestión integral de reservas de canchas deportivas y clases de gimnasio con instructores. Permite a los clientes consultar disponibilidad y reservar desde cualquier lugar, a los instructores administrar sus clases y bloques de horario, y a la coordinación/administración gestionar recintos, cupos, confirmaciones, reportes e indicadores de servicio.

---

## Estructura del Repositorio (`TR.01.02`)

```text
.
├── .github/                  # Plantillas de Issues, Pull Requests y flujo de CI/CD (GitHub Actions)
│   ├── ISSUE_TEMPLATE/       # Plantillas para subtareas (ST0X.0X / TR.0X) y errores
│   ├── workflows/ci.yml      # Pipeline de Integración Continua (TR.04)
│   └── pull_request_template.md
├── backend/                  # API REST (Node.js + Express 5 + Mongoose 9 + JWT + Jest/Supertest)
├── frontend/                 # Aplicación web (React 18 + Vite 6 + Tailwind CSS v4 + Nginx)
├── database/                 # Esquemas ($jsonSchema) e índices de MongoDB
│   ├── migrations/           # Validadores e índices de colecciones MongoDB (TR.03)
│   └── seeds/                # Datos semilla (integrados también en backend/src/scripts/seed.js)
├── tests/                    # Documentación y referencia de suites de pruebas automatizadas
├── docs/                     # Documentación del proyecto, Modelo E-R (TR.03) y Matriz RBAC (ST01.05)
├── docker-compose.yml        # Orquestación: backend (:3000), frontend (:8080) y Mongo local opcional (perfil local-db)
├── .env.example              # Plantilla de variables de entorno
├── .gitignore                # Exclusión de dependencias, builds, .env y archivos locales
├── CONTRIBUTING.md           # Guía de contribución, flujo de ramas y convención de commits
└── README.md                 # Documentación general del repositorio
```

---

## Roles del Sistema

| Rol | Responsabilidades principales |
| :--- | :--- |
| **Cliente** | Se registra, consulta disponibilidad de recintos activos e instructores, reserva/cancela su cupo, confirma asistencia y envía quejas o sugerencias. |
| **Instructor** | Crea y edita sus propias clases en recintos activos, publica y actualiza bloques de disponibilidad sin solapamientos y consulta el conteo de reservas. |
| **Coordinador** | Visualiza y edita bloques de horarios de cualquier instructor por recinto (con registro de auditoría), confirma o cancela reservas pendientes, revisa sugerencias y descarga reportes. |
| **Administrador** | Crea usuarios e instructores con rol, crea/edita/desactiva recintos conservando su historial, gestiona horarios y reservas, exporta reportes CSV y consulta indicadores. |

---

## Plan y Estado de Sprints

- **Sprint 1 (Completado):** Tareas transversales (`TR.01` – `TR.04`) y **Épica 1 · Autenticación y usuarios (`HU01` – `HU03` / `ST01.01` – `ST01.08`)**.
- **Sprint 2 (Completado):** **Épica 2 · Gestión de recintos y horarios (`HU04` – `HU09` / `ST02.01` – `ST02.11`)**.
- **Sprint 3 (Completado):** **Épica 3 · Reservas (`HU10` – `HU17` / `ST03.01` – `ST03.11`)**, con cierre de concurrencia, fechas, índices y reasignación.
- **Sprint 4 (Completado):** **Épica 4 · Notificaciones multi-canal (`HU04` / `ST04.01`–`ST04.16`)** y **Épica 5 · Sugerencias de los clientes e indicadores (`HU05` / `ST05.01`–`ST05.07`)**.

---

## Requisitos Previos e Instalación Local

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/jlconcepcion/Grupo1_4taCohorte_DesarrolloDeSoftware.git
   cd Grupo1_4taCohorte_DesarrolloDeSoftware
   ```

2. **Configurar variables de entorno:**
   Copiar `backend/.env.example` a `backend/.env`, completar `MONGODB_URI` con la cadena de conexión de MongoDB Atlas y ajustar el `JWT_SECRET`.
   > **Nota:** Nunca subir archivos `.env` al repositorio. Si la contraseña de Atlas contiene caracteres especiales, codifícalos en la URI (por ejemplo `@` → `%40`).

---

## Levantamiento con Docker (Recomendado · `TR.02`)

Levanta `backend` y `frontend` con un solo comando. El backend usa la base de datos configurada en `backend/.env`; por defecto, MongoDB Atlas.

```bash
cp backend/.env.example backend/.env   # PowerShell: Copy-Item backend/.env.example backend/.env
docker compose up -d --build
```

El clúster de Atlas debe tener un usuario de base de datos con permisos sobre `reservas_gimnasio` y la IP actual habilitada en **Network Access**.

### Servicios Activos

| Servicio | URL | Descripción |
| :--- | :--- | :--- |
| **Frontend (React + Vite + Nginx)** | http://localhost:8080 | Landing pública, Login, Registro y Panel por rol |
| **API REST (Express + Mongoose)** | http://localhost:3000/api/health | Backend API REST conectada a MongoDB Atlas |
| **MongoDB Atlas** | Cluster externo | Base de datos `reservas_gimnasio` |

### MongoDB Local Opcional

El servicio `mongo` no se inicia por defecto. Para usar un MongoDB local en Docker, cambia `MONGODB_URI` en `backend/.env` a `mongodb://mongo:27017/reservas_gimnasio` y levanta el perfil:

```bash
docker compose --profile local-db up -d --build
```

### Aplicar Validadores e Índices

Con los contenedores levantados, sincroniza los esquemas e índices de MongoDB antes de sembrar datos:

```bash
docker compose exec backend npm run migrate
```

### Cargar Datos de Prueba (Usuarios, Recintos, Clases y Bloques)

Con los contenedores levantados, ejecuta:
El frontend muestra una **landing pública de presentación** y, desde sus botones «Iniciar sesión» / «Crear cuenta», el flujo real de autenticación.

Cargar los usuarios de prueba (con los contenedores arriba):

```bash
docker compose exec backend npm run seed
```

El seed se ejecuta contra la base configurada en `backend/.env` (Atlas por defecto) y crea o actualiza los 4 usuarios de prueba, 3 recintos iniciales (*Cancha 1*, *Sala Funcional Principal* y *Sala de Spinning*), 2 clases y 2 bloques de disponibilidad:

| Rol | Correo | Contraseña |
| :--- | :--- | :--- |
| **Administrador** | `admin@gym.com` | `Admin12345` |
| **Coordinador** | `coordinador@gym.com` | `Coord12345` |
| **Instructor** | `instructor@gym.com` | `Instructor12345` |
| **Cliente** | `cliente@gym.com` | `Cliente12345` |

Para detener el entorno: `docker compose down`. Agregar `-v` elimina el volumen de MongoDB local, pero no afecta los datos en Atlas.

---

## Levantamiento Local sin Docker

**Backend:**
```bash
cd backend
cp .env.example .env        # completar MONGODB_URI (Atlas) y JWT_SECRET
npm install
npm run dev
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```
Disponible en http://localhost:5173 (Vite redirige `/api` al backend en el puerto `3000`).

---

## Endpoints de la API REST (Sprints 1-4)

| Método | Ruta | Descripción | Roles autorizados |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Verificación de estado del servidor | Público |
| `POST` | `/api/auth/registro` | Registro público de clientes (`HU01`) | Público |
| `POST` | `/api/auth/login` | Inicio de sesión con JWT (`HU02`) | Público |
| `GET` | `/api/auth/perfil` | Perfil del usuario autenticado (`HU02`) | Todos los roles autenticados |
| `GET` | `/api/usuarios` | Listado de usuarios registrados (`HU03`) | `administrador` |
| `POST` | `/api/usuarios` | Crear usuario o instructor con rol y nombre opcional (`HU03`, `ST04.16`) | `administrador` |
| `PATCH` | `/api/usuarios/:id` | Editar nombre de usuario y teléfono propios o de cualquier usuario (`ST04.16`) | Dueño de la cuenta, `administrador` |
| `GET` | `/api/recintos` | Listar recintos (clientes solo ven activos) (`HU04`, `HU05`) | Todos los roles autenticados |
| `POST` | `/api/recintos` | Crear nuevo recinto activo (`HU04`) | `administrador` |
| `PUT / PATCH` | `/api/recintos/:id` | Actualizar datos o activar/desactivar recinto (`HU05`) | `administrador` |
| `GET` | `/api/clases` | Consultar clases (`?propias=true`, `?recinto=...`) (`HU06`) | Todos los roles autenticados |
| `POST` | `/api/clases` | Crear clase en recinto activo (`HU06`) | `instructor` |
| `PUT / PATCH` | `/api/clases/:id` | Actualizar clase propia (`HU06`) | `instructor` (propietario) |
| `GET` | `/api/bloques` | Consultar bloques de disponibilidad por recinto/día (`HU07`–`HU09`) | Todos los roles autenticados |
| `POST` | `/api/bloques` | Registrar bloque propio validando no solapamiento (`HU07`) | `instructor` |
| `PUT / PATCH` | `/api/bloques/:id` | Editar bloque propio (`HU08`) o de cualquier instructor con auditoría (`HU09`) | `instructor` (propio), `coordinador`, `administrador` |
| `DELETE` | `/api/bloques/:id` | Eliminar bloque sin reservas activas (`ST02.07`, `HU09`) | `instructor` (propio), `coordinador`, `administrador` |
| `GET` | `/api/reservas/disponibilidad` | Consultar horarios con cupos libres por fecha, recinto y clase (`HU10`, `ST03.03`) | Todos los roles autenticados |
| `POST` | `/api/reservas` | Reservar un cupo con control de concurrencia (`HU11`, `ST03.05`) | `cliente` |
| `GET` | `/api/reservas/mias` | Consultar reservas propias (`?tipo=proximas\|pasadas\|todas`) (`HU13`) | `cliente` |
| `PATCH` | `/api/reservas/:id/confirmar-asistencia` | Confirmar asistencia propia hasta 1h antes (`HU14`) | `cliente` (propietario) |
| `PATCH` | `/api/reservas/:id/cancelar-propia` | Cancelar reserva propia y liberar cupo (`HU12`, `ST03.06`) | `cliente` (propietario) |
| `GET` | `/api/reservas` | Consultar todas las reservas con filtros combinados (`HU15`, `ST03.07`) | `coordinador`, `administrador` |
| `PATCH` | `/api/reservas/:id/confirmar` | Confirmar reserva pendiente (`HU16`, `ST03.08`) | `coordinador`, `administrador` |
| `PATCH` | `/api/reservas/:id/cancelar` | Cancelar reserva con motivo opcional y liberar cupo (`HU17`, `ST03.08`) | `coordinador`, `administrador` |
| `PATCH` | `/api/reservas/:id/reasignar` | Editar / reasignar reserva (`ST03.10`) | `administrador` |
| `GET` | `/api/reservas/conteo-instructor` | Conteo de reservas y confirmadas por clase y horario (`ST03.09`) | `instructor`, `coordinador`, `administrador` |
| `GET` | `/api/notificaciones/confirmar-asistencia?token=...` | Confirma asistencia desde el enlace firmado del recordatorio (`HU04`, `ST04.04`) | Público |
| `GET` | `/api/notificaciones` | Consulta historial de notificaciones (`ST04.12`) | `coordinador`, `administrador` |
| `GET` | `/api/notificaciones/mias` | Consulta notificaciones de navegación propias (`ST04.14`) | Todos los roles autenticados |
| `PATCH` | `/api/notificaciones/:id/leida` | Marca como leída una notificación de navegación propia (`ST04.14`) | Todos los roles autenticados |
| `POST` | `/api/notificaciones/:id/reenviar` | Reenvía solo el canal fallido (`ST04.10`) | `coordinador`, `administrador` |
| `POST` | `/api/notificaciones/resumen-instructor` | Envía el conteo de reservas del instructor (`ST04.06`) | `coordinador`, `administrador` |
| `GET` | `/api/reportes/reservas.csv` | Descarga el listado filtrado de reservas en CSV (`ST04.07`) | `coordinador`, `administrador` |

---

## Pruebas Automatizadas y Documentación

```bash
cd backend && npm test -- --runInBand   # 10 suites / 96 pruebas en Jest + Supertest (Sprints 1-4)
cd frontend && npm run build            # Verificación de compilación de React + Vite
```

Las pruebas de backend usan mocks y no se conectan a MongoDB Atlas.

- **Modelo Entidad-Relación (`TR.03`):** [docs/modelo_entidad_relacion.md](./docs/modelo_entidad_relacion.md)
- **Plan del Sprint 4 (`HU04`):** [docs/plan_sprint4_notificaciones.md](./docs/plan_sprint4_notificaciones.md)
- **Matriz de Permisos por Rol (`ST01.05`):** [docs/permisos.md](./docs/permisos.md)
- **Guía de Contribución (`TR.01.06`):** [CONTRIBUTING.md](./CONTRIBUTING.md)
