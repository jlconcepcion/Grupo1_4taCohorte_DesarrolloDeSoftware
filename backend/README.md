# Backend (`backend/`)

API REST construida con **Node.js, Express 5, Mongoose 9, JSON Web Tokens (`jsonwebtoken`) y `bcryptjs`**.

---

## Estructura

```text
backend/
├── src/
│   ├── config/
│   │   ├── db.js                       # Conexión a MongoDB (Mongoose)
│   │   ├── jwt.js                      # Firma y verificación de tokens JWT (2h por defecto)
│   │   └── permisos.js                 # Matriz RBAC de acciones autorizadas por rol (ST01.05)
│   ├── controllers/
│   │   ├── auth.controller.js          # Registro público (HU01), login y perfil (HU02)
│   │   ├── usuarios.controller.js      # Alta y listado de usuarios/instructores por admin (HU03)
│   │   ├── recintos.controller.js      # CRUD y desactivación lógica de recintos (HU04, HU05)
│   │   ├── clases.controller.js        # CRUD de clases para instructores en recintos activos (HU06)
│   │   ├── bloques.controller.js      # Bloques de horario, validación de solapamientos y auditoría (HU07–HU09)
│   │   ├── reservas.controller.js     # Reservas, confirmación, cancelación, conteo y reasignación (HU10–HU17)
│   │   ├── notificaciones.controller.js # Token público, auditoría, reenvío y resumen (Sprint 4)
│   │   └── reportes.controller.js     # Exportación CSV de reservas (ST04.07)
│   ├── middlewares/
│   │   ├── auth.js                     # Verificación de token Bearer en encabezado Authorization
│   │   └── roles.js                    # Middleware requirePermiso(accion)
│   ├── models/
│   │   ├── User.js                     # Modelo de usuarios con hash bcrypt pre-save (ST01.01, ST01.02)
│   │   ├── Recinto.js                  # Modelo de recintos deportivos y salas de gimnasio (ST02.01)
│   │   ├── Clase.js                    # Modelo de clases asociadas a instructor y recinto (ST02.01)
│   │   ├── BloqueDisponibilidad.js     # Modelo de bloques horarios con historial de auditoría (ST02.01, ST02.09)
│   │   ├── Reserva.js                  # Modelo de reservas con token de asistencia y recordatorio (Sprint 4)
│   │   └── Notificacion.js             # Auditoría de envíos por correo y WhatsApp (Sprint 4)
│   ├── routes/
│   │   ├── auth.routes.js              # /api/auth/*
│   │   ├── usuarios.routes.js          # /api/usuarios/*
│   │   ├── recintos.routes.js          # /api/recintos/*
│   │   ├── clases.routes.js            # /api/clases/*
│   │   ├── bloques.routes.js           # /api/bloques/*
│   │   ├── reservas.routes.js          # /api/reservas/*
│   │   ├── confirmacion.routes.js      # /api/notificaciones/confirmar-asistencia (público)
│   │   ├── notificaciones.routes.js    # /api/notificaciones/*
│   │   └── reportes.routes.js          # /api/reportes/*
│   ├── services/
│   │   ├── notificaciones.service.js  # Multi-canal, token y auditoría (Sprint 4)
│   │   └── canales/                    # Adaptadores SMTP y Twilio WhatsApp
│   ├── jobs/
│   │   └── recordatorios.job.js        # Proceso programado de recordatorios (ST04.02)
│   ├── scripts/
│   │   └── seed.js                     # Semilla de usuarios por rol, recintos, clases y bloques iniciales
│   ├── app.js                          # Configuración de Express y montaje de rutas
│   └── server.js                       # Punto de entrada del servidor HTTP
├── tests/                              # Suites de pruebas automatizadas con Jest + Supertest (80 tests)
├── Dockerfile                          # Imagen Node 22 Alpine para producción/desarrollo
└── package.json
```

---

## Comandos

```bash
npm install
npm run dev                  # Levanta el servidor con nodemon en http://localhost:3000
npm start                    # Levanta el servidor con node
npm run migrate              # Sincroniza validadores e índices de MongoDB desde database/migrations/
npm run seed                 # Crea/actualiza usuarios de prueba, recintos, clases y bloques en MongoDB
npm test -- --runInBand      # Ejecuta las 9 suites de pruebas automatizadas (80 tests)
```
