const Reserva = require('../models/Reserva');
const Notificacion = require('../models/Notificacion');
const User = require('../models/User');
const {
  verificarTokenAsistencia,
  fechaHoraInicio,
  reenviarNotificacion,
  construirResumenInstructor,
  enviarResumenInstructor,
  construirListaConfirmadosPorClase,
  enviarMensajeDirecto,
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

const ROLES_DESTINO_VALIDOS = ['cliente', 'instructor', 'coordinador', 'administrador', 'todos'];

async function enviarMensaje(req, res) {
  try {
    const {
      destinatarioId = '',
      rolDestino = '',
      asunto = '',
      mensaje = '',
      claseId = '',
      fecha = '',
    } = req.body || {};

    let reporteClase = null;
    if (claseId && String(claseId).trim()) {
      reporteClase = await construirListaConfirmadosPorClase({
        claseId: String(claseId).trim(),
        fecha: String(fecha || '').trim(),
      });
      if (!reporteClase) {
        return res.status(404).json({ mensaje: 'La clase seleccionada no existe' });
      }
    }

    const asuntoBase = String(asunto || '').trim();
    const mensajeBase = String(mensaje || '').trim();

    if (!reporteClase && !mensajeBase) {
      return res.status(400).json({
        mensaje: 'Debes escribir un mensaje o seleccionar una clase para adjuntar su lista de confirmados',
      });
    }

    let destinatarios = [];
    const destIdLimpio = String(destinatarioId || '').trim();
    const rolLimpio = String(rolDestino || '').trim();

    if (destIdLimpio && destIdLimpio !== 'instructor_clase') {
      const usuario = await User.findById(destIdLimpio);
      if (!usuario || usuario.activo === false) {
        return res.status(404).json({ mensaje: 'Destinatario no encontrado' });
      }
      destinatarios = [usuario];
    } else if (rolLimpio) {
      if (!ROLES_DESTINO_VALIDOS.includes(rolLimpio)) {
        return res.status(400).json({ mensaje: 'El rol de destino no es válido' });
      }
      const filtroUsuarios = { activo: { $ne: false } };
      if (rolLimpio !== 'todos') {
        filtroUsuarios.rol = rolLimpio;
      }
      const encontrados = await User.find(filtroUsuarios);
      destinatarios = Array.isArray(encontrados) ? encontrados : [];
    } else if (reporteClase) {
      const inst = reporteClase.clase?.instructor;
      const instId = inst?._id || inst;
      if (inst && typeof inst === 'object' && inst.correo) {
        destinatarios = [inst];
      } else if (instId) {
        const usuarioInst = await User.findById(instId);
        if (usuarioInst) destinatarios = [usuarioInst];
      }
    }

    if (!destinatarios.length) {
      return res.status(404).json({
        mensaje: 'No se encontraron destinatarios activos para enviar el correo',
      });
    }

    const asuntoFinal =
      asuntoBase ||
      (reporteClase ? reporteClase.asunto : 'Comunicado de administración · FitBook');

    const mensajeFinal =
      reporteClase && mensajeBase
        ? `${mensajeBase}\n\n${reporteClase.texto}`
        : reporteClase
        ? reporteClase.texto
        : mensajeBase;

    const htmlFinal =
      reporteClase && mensajeBase
        ? `<p>${mensajeBase
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('\n', '<br/>')}</p><hr/>${reporteClase.html}`
        : reporteClase
        ? reporteClase.html
        : '';

    const tipoNotificacion = reporteClase ? 'resumen_instructor' : 'sistema';

    const resultados = [];
    for (const usuarioDestino of destinatarios) {
      const envios = await enviarMensajeDirecto({
        destinatario: usuarioDestino,
        asunto: asuntoFinal,
        mensaje: mensajeFinal,
        html: htmlFinal,
        tipo: tipoNotificacion,
      });
      resultados.push({
        usuarioId: usuarioDestino._id,
        correo: usuarioDestino.correo,
        rol: usuarioDestino.rol,
        canales: envios,
      });
    }

    return res.json({
      mensaje: `Correo enviado a ${destinatarios.length} destinatario(s)`,
      asunto: asuntoFinal,
      totalDestinatarios: destinatarios.length,
      resumenClase: reporteClase
        ? {
            clase: reporteClase.clase?.nombre,
            fecha: reporteClase.fecha,
            totales: reporteClase.totales,
            confirmadas: reporteClase.confirmadas,
            pendientes: reporteClase.pendientes,
          }
        : null,
      resultados,
    });
  } catch (err) {
    return res.status(500).json({ mensaje: 'Error al enviar el correo a los destinatarios' });
  }
}

module.exports = {
  confirmarAsistenciaPorToken,
  listarNotificaciones,
  listarMias,
  marcarLeida,
  reenviar,
  enviarResumen,
  enviarMensaje,
};
