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
├── docker-compose.yml        # Orquestación de contenedores: mongo:7, backend (:3000) y frontend (:8080)
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
- **Sprint 3:** **Épica 3 · Reservas (`HU10` – `HU17` / `ST03.01` – `ST03.11`)**.
- **Sprint 4:** **Épica 4 · Notificaciones** y **Épica 5 · Sugerencias de los clientes**.

---

## Requisitos Previos e Instalación Local

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/jlconcepcion/Grupo1_4taCohorte_DesarrolloDeSoftware.git
   cd Grupo1_4taCohorte_DesarrolloDeSoftware
   ```

2. **Configurar variables de entorno:**
   Copiar el archivo de ejemplo `.env.example` a `.env` y ajustar el `JWT_SECRET`.
   > **Nota:** Nunca subir archivos `.env` al repositorio.

---

## Levantamiento con Docker (Recomendado · `TR.02`)

Levanta todo el entorno (`mongo:7`, `backend` y `frontend`) con un solo comando:

```bash
cp .env.example .env       # PowerShell: Copy-Item .env.example .env
docker compose up -d --build
```

### Servicios Activos

| Servicio | URL | Descripción |
| :--- | :--- | :--- |
| **Frontend (React + Vite + Nginx)** | http://localhost:8080 | Landing pública, Login, Registro y Panel por rol |
| **API REST (Express + Mongoose)** | http://localhost:3000/api/health | Backend API REST conectada a MongoDB |
| **MongoDB 7** | `localhost:27017` | Base de datos `reservas_gimnasio` |

### Cargar Datos de Prueba (Usuarios, Recintos, Clases y Bloques)

Con los contenedores levantados, ejecuta:

```bash
docker compose exec backend npm run seed
```

El seed crea o actualiza los 4 usuarios de prueba y registra además 3 recintos iniciales (*Cancha 1*, *Sala Funcional Principal* y *Sala de Spinning*), 2 clases y 2 bloques de disponibilidad:

| Rol | Correo | Contraseña |
| :--- | :--- | :--- |
| **Administrador** | `admin@gym.com` | `Admin12345` |
| **Coordinador** | `coordinador@gym.com` | `Coord12345` |
| **Instructor** | `instructor@gym.com` | `Instructor12345` |
| **Cliente** | `cliente@gym.com` | `Cliente12345` |

Para detener el entorno: `docker compose down` (agregar `-v` para borrar los datos de MongoDB).

---

## Levantamiento Local sin Docker

**Backend:**
```bash
cd backend
cp .env.example .env        # completar MONGODB_URI y JWT_SECRET
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

## Endpoints de la API REST (Sprints 1 y 2)

| Método | Ruta | Descripción | Roles autorizados |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Verificación de estado del servidor | Público |
| `POST` | `/api/auth/registro` | Registro público de clientes (`HU01`) | Público |
| `POST` | `/api/auth/login` | Inicio de sesión con JWT (`HU02`) | Público |
| `GET` | `/api/auth/perfil` | Perfil del usuario autenticado (`HU02`) | Todos los roles autenticados |
| `GET` | `/api/usuarios` | Listado de usuarios registrados (`HU03`) | `administrador` |
| `POST` | `/api/usuarios` | Crear usuario o instructor con rol (`HU03`) | `administrador` |
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

---

## Pruebas Automatizadas y Documentación

```bash
cd backend && npm test -- --runInBand   # 6 suites / 45 pruebas en Jest + Supertest (Sprints 1 y 2)
cd frontend && npm run build            # Verificación de compilación de React + Vite
```

- **Modelo Entidad-Relación (`TR.03`):** [docs/modelo_entidad_relacion.md](./docs/modelo_entidad_relacion.md)
- **Matriz de Permisos por Rol (`ST01.05`):** [docs/permisos.md](./docs/permisos.md)
- **Guía de Contribución (`TR.01.06`):** [CONTRIBUTING.md](./CONTRIBUTING.md)
