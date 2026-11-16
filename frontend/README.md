# Frontend (`frontend/`)

Aplicación web responsiva en **React 18 + Vite 6 + Tailwind CSS v4** que implementa la landing pública, el flujo de autenticación del Sprint 1 y los paneles de gestión de recintos, clases y bloques de disponibilidad del Sprint 2.

---

## Comandos

```bash
npm install
npm run dev      # http://localhost:5173 (proxy /api -> http://localhost:3000)
npm run build    # Genera el compilado de producción en dist/
npm run preview  # Sirve el build localmente
```

---

## Estructura

```text
src/
├── api.js              # Cliente HTTP con JWT en localStorage (auth, usuariosApi, recintosApi, clasesApi, bloquesApi)
├── App.jsx             # Enrutamiento de estado: Landing -> Login / Registro -> Dashboard por rol
├── main.jsx            # Punto de entrada de React
├── index.css           # Tailwind CSS v4, tema y componentes visuales del diseño de Figma
├── components/
│   └── Icon.jsx        # Conjunto de iconos SVG reutilizables
└── pages/
    ├── Landing.jsx     # Página pública de presentación (diseño Figma)
    ├── Login.jsx       # Inicio de sesión responsivo (HU02, ST01.06)
    ├── Registro.jsx    # Registro público de clientes con validación por campo (HU01, ST01.06)
    └── Dashboard.jsx   # Panel interactivo adaptado a los 4 roles (Sprints 1 y 2):
                        # - Administrador: Crear/editar/desactivar recintos (HU04, HU05), crear usuarios (HU03) y editar horarios (HU09)
                        # - Instructor: Crear/editar clases en recintos activos (HU06) y publicar/actualizar bloques propios (HU07, HU08)
                        # - Coordinador: Consultar horarios por recinto y editar bloques con auditoría (HU09)
                        # - Cliente: Consultar recintos activos y horarios disponibles por día/recinto (ST02.10)
```

En producción dentro de Docker, el contenedor Nginx (`frontend/Dockerfile` y `frontend/nginx.conf`) sirve `dist/` en el puerto `8080` y redirige `/api` hacia el contenedor `backend:3000`.
