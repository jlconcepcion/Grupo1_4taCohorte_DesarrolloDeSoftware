# Frontend (`frontend/`)

Aplicación web responsiva en **React 18 + Vite 6 + Tailwind CSS v4** que implementa la landing pública, el flujo de autenticación del Sprint 1 y los paneles de gestión de recintos, clases y bloques de disponibilidad del Sprint 2.

---
Aplicación web en **React + Vite + Tailwind CSS v4** con la landing pública y las pantallas de autenticación del Sprint 1.

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
├── api.js              # Cliente HTTP con JWT en sessionStorage (sesión independiente por pestaña) (auth, usuariosApi, recintosApi, clasesApi, bloquesApi)
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

La sesión JWT se guarda en `sessionStorage`: cada pestaña mantiene su propio usuario y token, por lo que se pueden usar roles distintos simultáneamente. Recargar conserva la sesión de esa pestaña; cerrarla la descarta.

En producción dentro de Docker, el contenedor Nginx (`frontend/Dockerfile` y `frontend/nginx.conf`) sirve `dist/` en el puerto `8080` y redirige `/api` hacia el contenedor `backend:3000`.
├── api.js              # Cliente HTTP con JWT en sessionStorage
├── App.jsx             # Landing -> login/registro -> panel según sesión
├── main.jsx            # Punto de entrada
├── index.css           # Tailwind v4, tema y estilos del diseño de Figma
├── components/
│   └── Icon.jsx        # Set de iconos SVG
└── pages/
    ├── Landing.jsx     # Página de presentación (diseño Figma)
    ├── Login.jsx       # Inicio de sesión
    ├── Registro.jsx    # Registro de clientes
    └── Dashboard.jsx   # Panel inicial según el rol
```

La landing se muestra antes de iniciar sesión; sus botones «Iniciar sesión», «Crear cuenta»,
«Ver disponibilidad» y «Acceder» llevan al flujo real de autenticación.

En producción el contenedor Nginx sirve `dist/` y redirige `/api` al servicio `backend`.
