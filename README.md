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
   Copiar el archivo de ejemplo `.env.example` a `.env` (se incorpora en `TR.02`) y ajustar las credenciales locales.
   > **Nota:** Nunca subir archivos `.env` al repositorio.

3. **Ejecución del entorno de desarrollo:**
   *(Se documentará el comando único de arranque al completar `TR.02`).*

---

## Contribución y Flujo de Trabajo

Antes de crear una rama o abrir un Pull Request, revisa la guía oficial en [CONTRIBUTING.md](./CONTRIBUTING.md), donde se detallan:
- Protección de la rama `main`.
- Nomenclatura de ramas (`feature/HU0X-descripcion`, `chore/TR0X-descripcion`).
- Convención de mensajes de commit.
- Uso obligatorio del ID de subtarea (`ST0X.0X` / `TR.0X.0X`) en cada Pull Request.


## Levantamiento 

## Backend

```bash
cd backend
cp .env.example .env    # completar MONGODB_URI y JWT_SECRET
npm install
npm run dev
```

Comprobar en http://localhost:3000/api/health