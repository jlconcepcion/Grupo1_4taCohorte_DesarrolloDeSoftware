# Frontend

Aplicación web en **React + Vite** con las pantallas de autenticación del Sprint 1.

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
├── App.jsx             # Control de sesión y navegación login/registro/panel
├── main.jsx            # Punto de entrada
├── styles.css          # Estilos responsivos (desde 360 px)
└── pages/
    ├── Login.jsx       # Inicio de sesión
    ├── Registro.jsx    # Registro de clientes
    └── Dashboard.jsx   # Panel inicial según el rol
```

En producción el contenedor Nginx sirve `dist/` y redirige `/api` al servicio `backend`.
