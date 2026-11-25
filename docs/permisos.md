# Matriz de permisos por rol

La fuente de verdad es `backend/src/config/permisos.js`.

| Acción | Cliente | Coordinador | Instructor | Administrador |
|---|:-:|:-:|:-:|:-:|
| Crear usuarios e instructores | | | | ✔ |
| Ver recintos | ✔ | ✔ | ✔ | ✔ |
| Gestionar recintos | | | | ✔ |
| Gestionar sus clases | | | ✔ | |
| Gestionar sus horarios | | | ✔ | |
| Gestionar horarios de cualquier instructor | | ✔ | | ✔ |
| Reservar | ✔ | | | |
| Cancelar reserva propia | ✔ | | | |
| Confirmar o cancelar reservas de otros | | ✔ | | ✔ |
| Reasignar reservas | | | | ✔ |
| Ver conteo de reservas | | ✔ | ✔ | ✔ |
| Enviar sugerencias | ✔ | | | |
| Ver sugerencias | | ✔ | | ✔ |
| Ver reportes | | ✔ | | ✔ |
| Ver notificaciones propias de navegación | ✔ | ✔ | ✔ | ✔ |
| Consultar y editar preferencias propias de recordatorio | ✔ | ✔ | ✔ | ✔ |
| Consultar y editar preferencias de recordatorio de otros usuarios | | | | ✔ |
| Editar nombre de usuario y teléfono propios | ✔ | ✔ | ✔ | ✔ |
| Editar nombre de usuario y teléfono de otros usuarios | | | | ✔ |
| Ver auditoría de notificaciones | | ✔ | | ✔ |
| Reenviar notificaciones y enviar resúmenes | | ✔ | | ✔ |
| Ver indicadores | | | | ✔ |
