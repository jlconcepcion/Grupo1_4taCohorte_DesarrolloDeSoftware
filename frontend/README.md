# Frontend

Aplicación web en **React + Vite + Tailwind CSS v4** con la landing pública y las pantallas de autenticación del Sprint 1.

## Comandos

```bash
npm install
npm run dev      # http://localhost:5173 (proxy /api -> http://localhost:3000)
npm run build    # genera dist/
npm run preview  # sirve el build localmente
```

## Estructura

```text
src/
├── api.js              # Cliente HTTP (JWT en localStorage)
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
