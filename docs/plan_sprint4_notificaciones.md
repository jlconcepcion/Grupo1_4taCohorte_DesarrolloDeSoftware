# Plan de Sprint 4 · Notificaciones Multi-canal (`HU04`)

## Alcance

Este sprint implementa únicamente la **Épica 4 · Notificaciones y reportes** del backlog original (`HU04`, `ST04.01`–`ST04.14`). La Épica 5 · Sugerencias e indicadores (`HU05`) queda pendiente y no se modifica en esta rama.

Se conserva la numeración original del backlog aunque `HU04` ya existiera como código visual en el panel de recintos del frontend.

## Decisiones acordadas

- **Canales:** correo SMTP (`nodemailer`), WhatsApp Business mediante API REST de Twilio y un tercer canal interno de **navegación**, persistido y mostrado en el Dashboard sin depender de credenciales externas.
- **Configuración de prueba local:** `backend/.env` usa Mailpit (`SMTP_HOST=mailpit`, `SMTP_PORT=1025`, sin auth) y `TWILIO_MODO_SIMULACION=true`, por lo que el correo llega a `http://localhost:8025` y WhatsApp se registra como `enviado` con `proveedorId` simulado. Para producción se requieren credenciales reales y plantilla aprobada.
- **Envío:** ambos canales en paralelo con `Promise.allSettled`; si uno falla, el otro continúa. Solo se reintenta el canal fallido.
- **Confirmación:** el enlace firmado confirma **asistencia `HU14`**, no una reserva pendiente; usa `NOTIFICACION_TOKEN_SECRET` distinto de `JWT_SECRET`, propósito `asistencia` y expiración configurable.
- **Zona horaria:** global mediante `TZ` (por defecto `America/Bogota`).
- **Ventana:** recordatorio para reservas que inician en `NOTIFICACIONES_VENTANA_MIN` minutos, con tolerancia `NOTIFICACIONES_TOLERANCIA_MIN`.
- **Idempotencia:** por reserva, tipo y canal; `recordatorioEnviado` se marca si al menos un canal llega.
- **Auditoría:** colección `notificaciones` con estado por intento y posibilidad de reenvío manual del canal fallido.
- **Cancelación:** al cancelar una reserva se registra aviso de navegación para el cliente y para quien cancela; el mensaje al cliente identifica al responsable e incluye el motivo, y en autocancelación se emite uno solo.
- **Excepción documentada:** el enlace de recordatorio permite confirmar hasta el inicio de la clase (no 1 hora antes) porque se envía 1 hora antes; la confirmación manual desde la app conserva la regla de `HU14`.

## Subtareas

| Subtarea | Entregable |
| :--- | :--- |
| `ST04.01` | Adaptador SMTP con credenciales desde variables de entorno. |
| `ST04.02` | Job `backend/src/jobs/recordatorios.job.js` ejecutado al arrancar el servidor y cada `NOTIFICACIONES_INTERVAL_MS`. |
| `ST04.03` | Campos `recordatorioEnviado` y `token*` en `Reserva` y validador MongoDB actualizado. |
| `ST04.04` | Token JWT de un solo uso con verificación de expiración y token vigente almacenado. |
| `ST04.05` | Plantilla HTML/texto con recinto, clase, fecha, hora y botón de confirmación. |
| `ST04.06` | Endpoint de resumen del instructor y envío por correo/WhatsApp. |
| `ST04.07` | `GET /api/reportes/reservas.csv` con los mismos filtros que el listado. |
| `ST04.08` | Suite original de pruebas ampliada con los nuevos casos. |
| `ST04.09` | Adaptador Twilio WhatsApp con normalización E.164. |
| `ST04.10` | Multi-canal con fallback y reenvío selectivo. |
| `ST04.11` | Plantilla unificada de correo y WhatsApp. |
| `ST04.12` | Auditoría `Notificacion` y consulta/reenvío desde coordinación. |
| `ST04.13` | Pruebas de fallo parcial, idempotencia, token, auditoría y resumen. |
| `ST04.14` | Canal de navegación: aviso persistido al crear usuario, visible en la bandeja desplegable del Dashboard y marcable como leído. |

## Variables de entorno nuevas

```env
TZ=America/Bogota
FRONTEND_URL=http://localhost:5173
BACKEND_PUBLIC_URL=http://localhost:3000
NOTIFICACIONES_INTERVAL_MS=60000
NOTIFICACIONES_VENTANA_MIN=60
NOTIFICACIONES_TOLERANCIA_MIN=5
NOTIFICACION_TOKEN_SECRET=reemplazar_por_un_secreto_largo_y_aleatorio
NOTIFICACION_TOKEN_TTL=2h
SMTP_HOST=smtp.ejemplo.com
SMTP_PORT=587
SMTP_USER=reemplazar_usuario
SMTP_PASS=reemplazar_clave
SMTP_FROM=Gimnasio <no-responder@ejemplo.com>
TWILIO_MODO_SIMULACION=false
TWILIO_ACCOUNT_SID=reemplazar_account_sid
TWILIO_AUTH_TOKEN=reemplazar_auth_token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

Las credenciales reales no se versionan; `backend/.env` está ignorado.

Las preferencias de recordatorio (`ST04.15`) se guardan por usuario con `activo`, `canales` (`email`, `whatsapp`, `navegacion`) y `minutosAnticipacion`. Los defaults son todos los canales activos y `null` para usar `NOTIFICACIONES_VENTANA_MIN=60`. El job usa la anticipación individual y el enlace de confirmación recibe un TTL extendido proporcional (`minutos + 120`).

## Verificación

- `cd backend && npm test -- --runInBand` → **10 suites / 96 pruebas** en verde.
- `cd frontend && npm run build` verificado correctamente.
- Prueba local: `docker compose up -d --build`; al crear un usuario con correo y teléfono se envía bienvenida por email a la bandeja de Mailpit `http://localhost:8025` y por WhatsApp simulado con `TWILIO_MODO_SIMULACION=true`, ambas auditadas en `notificaciones`.
- `docker compose up -d --build` verificado: `health=200`, `frontend=200`, `mailpit=200`.
- Smoke real: alta de usuario `201`, 1 mensaje en Mailpit y auditoría `email`, `whatsapp` y `navegacion` en estado `enviado`.
- Smoke de cancelación: `PATCH /api/reservas/:id/cancelar` → `200`; el cliente recibe `Reserva cancelada` con responsable y motivo, y quien cancela recibe `Cancelación registrada`.
- Preferencias: `GET/PUT /api/mi-perfil/preferencias-recordatorio` y `GET/PUT /api/usuarios/:id/preferencias-recordatorio` verificados en la suite `tests/sprint4_preferencias.test.js`; el registro y el alta administrativa capturan preferencias y el Dashboard permite editarlas.
- Twilio en modo trial requiere números verificados; en producción se requiere plantilla WhatsApp aprobada.
