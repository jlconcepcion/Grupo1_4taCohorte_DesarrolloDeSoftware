# Sistema de Reserva para Gimnasio y Canchas

**Proyecto Final · Metodologías Ágiles con Scrum**  
**Grupo 1 · 4ta Cohorte de Desarrollo de Software**

Aplicación web para la gestión integral de reservas de canchas deportivas y clases de gimnasio con instructores. Permite a los clientes consultar disponibilidad y reservar desde cualquier lugar, a los instructores administrar sus clases y bloques de horario, y a la coordinación/administración gestionar cupos, confirmaciones, reportes e indicadores de servicio.

---

## Estructura del Repositorio (`TR.01.02`)

```text
.
├── .github/                  # Plantillas de Issues, Pull Requests y flujos de CI/CD
│   ├── ISSUE_TEMPLATE/       # Plantillas para subtareas (ST0X.0X / TR.0X) y errores
│   └── pull_request_template.md
├── backend/                  # API REST, lógica de negocio, autenticación y middlewares RBAC
├── frontend/                 # Interfaz web responsiva para clientes y paneles administrativos
├── database/                 # Esquema de datos y datos iniciales
│   ├── migrations/           # Migraciones versionadas de la base de datos
│   └── seeds/                # Datos semilla para desarrollo y pruebas
├── tests/                    # Pruebas automatizadas (unitarias, integración y E2E)
├── docs/                     # Documentación del proyecto, modelo E-R y especificaciones
├── .gitignore                # Exclusión de dependencias, builds, .env y archivos locales
├── CONTRIBUTING.md           # Guía de contribución, flujo de ramas y convención de commits
└── README.md                 # Documentación general del repositorio
```

---

## Roles del Sistema

| Rol | Responsabilidades principales |
| :--- | :--- |
| **Cliente** | Consulta disponibilidad de recintos e instructores, reserva/cancela su cupo, confirma asistencia y envía quejas o sugerencias. |
| **Instructor** | Crea clases en recintos activos, publica bloques de disponibilidad y consulta el conteo de reservas y confirmaciones. |
| **Coordinador** | Visualiza recintos y reservas, confirma o cancela reservas pendientes para liberar cupos, administra horarios por recinto y revisa sugerencias. |
| **Administrador** | Gestiona usuarios, instructores y recintos, administra y reasigna reservas, exporta reportes CSV y consulta indicadores de desempeño. |

---

## Plan de Sprints y Épicas

- **Sprint 1:** Tareas transversales (`TR.01` – `TR.04`) y **Épica 1 · Autenticación y usuarios (`HU01`)**.
- **Sprint 2:** **Épica 2 · Gestión de recintos y horarios (`HU02`)**.
- **Sprint 3:** **Épica 3 · Reservas (`HU03`)**.
- **Sprint 4:** **Épica 4 · Notificaciones (`HU04`)** y **Épica 5 · Sugerencias de los clientes (`HU05`)**.

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

## Levantamiento con Docker (recomendado)

`TR.02` deja todo el entorno listo con un solo comando (MongoDB + backend + frontend):

```bash
cp .env.example .env       # PowerShell: Copy-Item .env.example .env
docker compose up --build
```

Servicios:

| Servicio | URL |
|---|---|
| Frontend (React + Nginx) | http://localhost:8080 |
| API REST | http://localhost:3000/api/health |
| MongoDB | `localhost:27017` |

El frontend muestra una **landing pública de presentación** y, desde sus botones «Iniciar sesión» / «Crear cuenta», el flujo real de autenticación.

Cargar los usuarios de prueba (con los contenedores arriba):

```bash
docker compose exec backend npm run seed
```

Si un usuario de prueba ya existe, el seed **actualiza su rol, contraseña y estado activo**, por lo que también sirve para corregir cuentas creadas por error desde el formulario de registro.

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | `admin@gym.com` | `Admin12345` |
| Coordinador | `coordinador@gym.com` | `Coord12345` |
| Instructor | `instructor@gym.com` | `Instructor12345` |
| Cliente | `cliente@gym.com` | `Cliente12345` |

Para detener el entorno: `docker compose down` (agregar `-v` para borrar los datos de MongoDB).

---

## Levantamiento local sin Docker

**Backend:**
```bash
cd backend
cp .env.example .env        # completar MONGODB_URI y JWT_SECRET
npm install
npm run dev
```

Comprobar en http://localhost:3000/api/health

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

Disponible en http://localhost:5173 (Vite redirige `/api` al backend en el puerto 3000).

---

## Endpoints de autenticación (Sprint 1)

| Método | Ruta | Descripción | Requiere token |
|---|---|---|---|
| `POST` | `/api/auth/registro` | Registro público de clientes | No |
| `POST` | `/api/auth/login` | Inicio de sesión (JWT, 2 h por defecto) | No |
| `GET` | `/api/auth/perfil` | Datos del usuario autenticado | Sí |
| `POST` | `/api/usuarios` | Crear usuario/instructor (solo administrador) | Sí |

---

## Pruebas

```bash
cd backend && npm test          # Jest + Supertest (auth, roles, usuarios)
cd frontend && npm run build    # verificación de compilación
```

## Contribución y Flujo de Trabajo

Antes de crear una rama o abrir un Pull Request, revisa la guía oficial en [CONTRIBUTING.md](./CONTRIBUTING.md), donde se detallan:
- Protección de la rama `main`.
- Nomenclatura de ramas (`feature/HU0X-descripcion`, `chore/TR0X-descripcion`).
- Convención de mensajes de commit.
- Uso obligatorio del ID de subtarea (`ST0X.0X` / `TR.0X.0X`) en cada Pull Request.