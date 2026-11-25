# Evaluación y Guía Paso a Paso: Implementación de Notificaciones con Mailgrid (`Épica 4 · HU04`)

**Proyecto:** Sistema de Reserva para Gimnasio y Canchas  
**Módulo evaluado:** `backend/src/services/canales/email.adapter.js` y `backend/src/services/notificaciones.service.js`  
**Objetivo:** Integrar el envío real de correos electrónicos (recordatorios automáticos 1 hora antes con enlace de confirmación `ST04.04` y resumen a instructores `ST04.06`) utilizando **Mailgrid** (compatible tanto con **Mailgrid SMTP/API** como con **Twilio SendGrid**).

---

## 1. Evaluación Técnica del Estado Actual

Al revisar la implementación actual del proyecto en `backend/src/services/`, se identificó lo siguiente:

### 1.1. Lo que ya está listo y funciona sin cambios
1. **Desacoplamiento por Patrón Adaptador (`backend/src/services/canales/email.adapter.js`):**
   - `notificaciones.service.js` no depende de un proveedor fijo; únicamente invoca:
     ```javascript
     emailAdapter.enviar({ destino, asunto, texto, html })
     ```
   - Espera como respuesta `{ estado: 'enviado', proveedorId: '...' }` o `{ estado: 'omitido', motivo: '...' }`.
2. **Reglas de negocio y plantillas HTML (`notificaciones.service.js`):**
   - Ya genera el correo HTML con recinto, clase, fecha, hora y el botón con el **token JWT firmado de un solo uso y caducidad (`ST04.04`)** apuntando a `GET /api/notificaciones/confirmar-asistencia?token=...`.
   - Ya registra cada intento en la colección `Notificacion` de MongoDB (`estado: 'enviado' | 'fallido' | 'omitido'`, `intentos`, `proveedorId`, `error`) garantizando que no se envíen recordatorios duplicados (`ST04.03`).
3. **Orquestación en Docker (`docker-compose.yml`):**
   - El servicio `backend` carga automáticamente todas las variables definidas en `backend/.env`.

### 1.2. Opciones de Integración Evaluadas

| Criterio | Opción A: Mailgrid por SMTP (`nodemailer`) | Opción B: Mailgrid por API HTTP REST (`fetch`) |
| :--- | :--- | :--- |
| **Cambios en código** | **Ninguno** (ya usa `nodemailer` en `email.adapter.js`) | ~35 líneas en `email.adapter.js` |
| **Puerto utilizado** | TCP `587` (STARTTLS) o `465` (SSL/TLS) | HTTPS `443` |
| **Ventaja principal** | Configuración inmediata solo editando `backend/.env` | No sufre bloqueos de firewall en puerto `587` y es más rápido |
| **Compatibilidad con tests** | 100% compatible (`__setTransporter`) | 100% compatible |

> **Recomendación:** Implementar un esquema **híbrido** en `email.adapter.js` que soporte **SMTP directo** (Opción A) y **API HTTP de Mailgrid/SendGrid** (Opción B), conservando **Mailpit (`localhost:8025`)** como entorno local de pruebas cuando se desee probar sin consumir cuota real.

---

## 2. Pasos a Seguir para la Implementación

### Paso 1 · Obtener Credenciales y Verificar Remitente en Mailgrid

1. Ingresar al panel de **Mailgrid** (o **SendGrid**, según la cuenta que utilice el equipo):
   - **Autorización de remitente (Sender Identity / Dominio):**
     - Verificar la dirección de correo remitente (por ejemplo `no-responder@tudominio.com` o un *Single Sender Verification* con el correo oficial del proyecto).
     - *Importante:* Si el correo en `SMTP_FROM` no está verificado en el panel del proveedor, el servidor rechazará el envío con error `550 Unauthenticated sender`.
   - **Credenciales a copiar:**
     - **Si es Mailgrid Panel (`mailgrid.com.br`):**
       - Host SMTP: `cloud.mailgrid.net.br` (o el host asignado a tu cuenta `smtp.mailgrid.net.br`)
       - Puerto: `587`
       - Usuario (`SMTP_USER`): usuario SMTP de la cuenta
       - Contraseña (`SMTP_PASS`): contraseña SMTP o API Key
     - **Si es SendGrid (`sendgrid.com`):**
       - Host SMTP: `smtp.sendgrid.net`
       - Puerto: `587`
       - Usuario (`SMTP_USER`): literalmente la palabra `apikey`
       - Contraseña (`SMTP_PASS`): la clave generada `SG.xxxx...`

---

### Paso 2 · Configurar Variables de Entorno en `backend/.env`

Abrir el archivo local `backend/.env` (que está excluido por `.gitignore` para no exponer secretos en GitHub) y configurar el bloque de correo:

#### Configuración vía SMTP Relay (Opción A — Funciona con el código actual)
```dotenv
# URL pública del backend para el botón "Confirmar asistencia" dentro del correo
BACKEND_PUBLIC_URL=http://localhost:3000
FRONTEND_URL=http://localhost:8080

# Configuración SMTP con Mailgrid
SMTP_HOST=cloud.mailgrid.net.br
SMTP_PORT=587
SMTP_USER=tu_usuario_mailgrid
SMTP_PASS=tu_clave_secreta_mailgrid
SMTP_FROM="FitBook Gimnasio y Canchas <tu_correo_verificado@dominio.com>"
```

*(Si utilizan cuenta de Twilio SendGrid, usar `SMTP_HOST=smtp.sendgrid.net` y `SMTP_USER=apikey`).*

---

### Paso 3 · Mejorar `backend/src/services/canales/email.adapter.js` (Soporte Híbrido API HTTP + SMTP + Timeouts)

Actualizar `backend/src/services/canales/email.adapter.js` para:
1. Soportar envío por **API HTTP de Mailgrid / SendGrid** (`MAILGRID_API_KEY` / `MAILGRID_API_URL`) además de **SMTP (`nodemailer`)**.
2. Agregar timeouts de conexión (`connectionTimeout: 10000`) y validación TLS para evitar que un fallo de red congele el job de recordatorios.

```javascript
const nodemailer = require('nodemailer');

let transporter = null;

function obtenerTransporter() {
  if (transporter) return transporter;

  const puerto = Number(process.env.SMTP_PORT || 587);
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: puerto,
    secure: puerto === 465,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });

  return transporter;
}

async function enviarPorApiMailgrid({ destino, asunto, texto, html }) {
  const apiUrl =
    process.env.MAILGRID_API_URL || 'https://api.mailgrid.net.br/send/';
  const respuesta = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.MAILGRID_API_KEY}`,
    },
    body: JSON.stringify({
      host_smtp: process.env.SMTP_HOST,
      usuario_smtp: process.env.SMTP_USER,
      senha_smtp: process.env.SMTP_PASS,
      emailRemetente: process.env.SMTP_FROM || process.env.SMTP_USER,
      nomeRemetente: process.env.MAILGRID_FROM_NAME || 'FitBook Gimnasio',
      emailDestino: [destino],
      assunto: asunto,
      mensagem: html || texto,
    }),
  });

  if (!respuesta.ok) {
    const detalle = await respuesta.text().catch(() => '');
    throw new Error(`Error Mailgrid API (${respuesta.status}): ${detalle}`);
  }

  const datos = await respuesta.json().catch(() => ({}));
  return {
    estado: 'enviado',
    proveedorId: datos?.id || datos?.messageId || 'mailgrid-api',
  };
}

async function enviar({ destino, asunto, texto, html }) {
  if (!destino) {
    return { estado: 'omitido', motivo: 'Destinatario vacío' };
  }

  // Si se configuró modo API HTTP de Mailgrid
  if (process.env.EMAIL_PROVIDER === 'mailgrid-api' && process.env.MAILGRID_API_KEY) {
    return enviarPorApiMailgrid({ destino, asunto, texto, html });
  }

  // Modo estándar SMTP (Mailgrid SMTP / SendGrid SMTP / Mailpit local)
  if (!process.env.SMTP_HOST) {
    return { estado: 'omitido', motivo: 'SMTP no configurado' };
  }

  const informacion = await obtenerTransporter().sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: destino,
    subject: asunto,
    text: texto,
    html: html || undefined,
  });

  return { estado: 'enviado', proveedorId: informacion?.messageId || null };
}

function __setTransporter(fakeTransporter) {
  transporter = fakeTransporter;
}

module.exports = { enviar, __setTransporter };
```

---

### Paso 4 · Documentar Plantilla en `backend/.env.example`

Agregar los comentarios de referencia en `backend/.env.example` (sin incluir claves reales):

```dotenv
# Opción 1: Mailpit local en Docker (http://localhost:8025)
# SMTP_HOST=mailpit
# SMTP_PORT=1025

# Opción 2: Mailgrid / SendGrid en Producción o Pruebas Reales
SMTP_HOST=cloud.mailgrid.net.br
SMTP_PORT=587
SMTP_USER=reemplazar_usuario_mailgrid
SMTP_PASS=reemplazar_clave_mailgrid
SMTP_FROM="FitBook Gimnasio <no-responder@tudominio.com>"
```

---

### Paso 5 · Prueba de Verificación End-to-End (`ST04.01` y `ST04.08`)

1. **Reiniciar el contenedor `backend`** tras actualizar `backend/.env`:
   ```bash
   docker compose --profile local-db up -d --build backend
   ```
2. **Probar envío inmediato desde el panel o vía endpoint:**
   - Iniciar sesión como **Coordinador** o **Administrador** en `http://localhost:8080`.
   - Enviar el resumen al instructor (`POST /api/notificaciones/resumen-instructor`) o crear una reserva con un cliente cuyo correo sea una bandeja real de prueba y que empiece dentro de la ventana de recordatorio (`NOTIFICACIONES_VENTANA_MIN=60`).
3. **Verificar el registro en MongoDB (`GET /api/notificaciones`):**
   - Confirmar que la notificación creada tenga:
     - `canal: "email"`
     - `estado: "enviado"`
     - `proveedorId: "<message-id-devuelto-por-mailgrid>"`
4. **Verificar el enlace de confirmación (`ST04.04`):**
   - Abrir el correo recibido en la bandeja real, hacer clic en el botón **«Confirmar asistencia»** y comprobar que la reserva pasa a estado **`confirmada`** y que un segundo clic informa que el enlace ya fue utilizado.

---

## 3. Checklist Resumen de Ejecución

- [ ] **1.** Verificar correo remitente (`SMTP_FROM`) y obtener credenciales SMTP/API en Mailgrid.
- [ ] **2.** Configurar `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` y `SMTP_FROM` en `backend/.env`.
- [ ] **3.** Actualizar `backend/src/services/canales/email.adapter.js` con timeouts y soporte híbrido.
- [ ] **4.** Actualizar `backend/tests/sprint4_notificaciones.test.js` con un caso de prueba unitario para Mailgrid.
- [ ] **5.** Reiniciar el contenedor `backend` y validar la llegada de un correo real a la bandeja de destino (`ST04.01`).
