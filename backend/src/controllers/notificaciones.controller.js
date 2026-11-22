const Reserva = require('../models/Reserva');
const Notificacion = require('../models/Notificacion');
const User = require('../models/User');
const {
  verificarTokenAsistencia,
  fechaHoraInicio,
  reenviarNotificacion,
  construirResumenInstructor,
  enviarResumenInstructor,
  listarNotificacionesNavegacion,
} = require('../services/notificaciones.service');

function responderConfirmacion(req, res, { ok, mensaje }) {
  const destino = process.env.FRONTEND_URL;
  if (!destino) {
    return res.status(ok ? 200 : 400).json({ ok, mensaje });
  }

  const separador = destino.includes('?') ? '&' : '?';
  const url = `${destino.replace(/\/$/, '')}${separador}confirmar=${ok ? 'ok' : 'error'}&motivo=${encodeURIComponent(
    mensaje
  )}`;
  return res.redirect(302, url);
}

async function poblarReserva(consulta) {
  if (consulta && typeof consulta.populate === 'function') {
    return consulta.populate([
      { path: 'cliente' },
      { path: 'recinto' },
      { path: 'clase' },
      { path: 'bloque' },
    ]);
  }
  return consulta;
}

async function confirmarAsistenciaPorToken(req, res) {
  const token = String(req.query?.token || '');
  if (!token) {
    return responderConfirmacion(req, res, {
      ok: false,
      mensaje: 'Falta el token de confirmación',
    });
  }

  let payload;
  try {
    payload = verificarTokenAsistencia(token);
  } catch (err) {
    return responderConfirmacion(req, res, {
      ok: false,
      mensaje: err.message || 'El enlace de confirmación no es válido',
    });
  }

  try {
    const reserva = await poblarReserva(Reserva.findById(payload.reservaId));
    if (!reserva) {
      return responderConfirmacion(req, res, {
        ok: false,
        mensaje: 'No se encontró la reserva asociada al enlace',
      });
    }
    if (reserva.tokenConfirmacion && String(reserva.tokenConfirmacion) !== token) {
      return responderConfirmacion(req, res, {
        ok: false,
        mensaje: 'El enlace de confirmación ya no está vigente',
      });
    }
    if (reserva.tokenUsadoEn) {
      return responderConfirmacion(req, res, {
        ok: true,
        mensaje: 'La asistencia ya había sido confirmada con este enlace',
      });
    }
    if (reserva.estado === 'cancelada') {
      return responderConfirmacion(req, res, {
        ok: false,
        mensaje: 'No se puede confirmar una reserva cancelada',
      });
    }

    const inicio = fechaHoraInicio(reserva);
    if (!inicio) {
      return responderConfirmacion(req, res, {
        ok: false,
        mensaje: 'No se pudo determinar el horario de la reserva',
      });
    }
    if (inicio.getTime() <= Date.now()) {
      return responderConfirmacion(req, res, {
        ok: false,
        mensaje: 'El enlace venció porque la clase ya inició',
      });
    }

    if (reserva.estado !== 'confirmada') {
      reserva.estado = 'confirmada';
      reserva.fechaConfirmacion = new Date();
      reserva.gestionadoPor = reserva.cliente?._id || reserva.cliente || null;
    }
    reserva.tokenUsadoEn = new Date();
    if (typeof reserva.save === 'function') await reserva.save();

    return responderConfirmacion(req, res, {
      ok: true,
      mensaje: 'Asistencia confirmada correctamente',
    });
  } catch (err) {
    return responderConfirmacion(req, res, {
      ok: false,
      mensaje: 'No se pudo confirmar la asistencia',
    });
  }
}

async function listarNotificaciones(req, res) {
  try {
    const { reserva, canal, estado, tipo, limite } = req.query || {};
    const filtro = {};
    if (reserva) filtro.reserva = reserva;
    if (canal) filtro.canal = canal;
    if (estado) filtro.estado = estado;
    if (tipo) filtro.tipo = tipo;

    let consulta = Notificacion.find(filtro);
    if (consulta && typeof consulta.populate === 'function') {
      consulta = consulta.populate([
        { path: 'reserva' },
        { path: 'destinatario', select: 'correo telefono rol' },
      ]);
    }
    if (consulta && typeof consulta.sort === 'function') {
      consulta = consulta.sort({ createdAt: -1 });
    }
    if (consulta && typeof consulta.limit === 'function') {
      consulta = consulta.limit(Math.min(Number(limite) || 50, 200));
    }

    return res.json(await consulta);
  } catch (err) {
    return res.status(500).json({ mensaje: 'Error al consultar las notificaciones' });
  }
}

async function reenviar(req, res) {
  try {
    const resultado = await reenviarNotificacion(req.params.id);
    return res.json({ mensaje: 'Notificación reenviada correctamente', ...resultado });
  } catch (err) {
    return res.status(400).json({ mensaje: err.message });
  }
}

async function enviarResumen(req, res) {
  try {
    const instructorId = req.body?.instructorId || req.user?.id;
    const instructor = await User.findById(instructorId);
    if (!instructor) {
      return res.status(404).json({ mensaje: 'Instructor no encontrado' });
    }

    const resumen = await construirResumenInstructor(instructorId);
    const resultados = await enviarResumenInstructor(instructor, resumen);
    return res.json({ resumen, resultados });
  } catch (err) {
    return res.status(500).json({ mensaje: 'Error al enviar el resumen del instructor' });
  }
}

async function listarMias(req, res) {
  try {
    return res.json(await listarNotificacionesNavegacion(req.user?.id));
  } catch (err) {
    return res.status(500).json({ mensaje: 'Error al consultar tus notificaciones' });
  }
}

async function marcarLeida(req, res) {
  try {
    const notificacion = await Notificacion.findById(req.params.id);
    if (!notificacion) {
      return res.status(404).json({ mensaje: 'Notificación no encontrada' });
    }
    if (String(notificacion.destinatario) !== String(req.user?.id)) {
      return res.status(403).json({ mensaje: 'La notificación no pertenece a tu cuenta' });
    }

    notificacion.leida = true;
    if (typeof notificacion.save === 'function') await notificacion.save();
    return res.json(notificacion);
  } catch (err) {
    return res.status(500).json({ mensaje: 'Error al marcar la notificación como leída' });
  }
}

module.exports = {
  confirmarAsistenciaPorToken,
  listarNotificaciones,
  listarMias,
  marcarLeida,
  reenviar,
  enviarResumen,
};
