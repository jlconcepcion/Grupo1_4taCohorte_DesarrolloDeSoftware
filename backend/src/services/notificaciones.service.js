const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Reserva = require('../models/Reserva');
const Notificacion = require('../models/Notificacion');
const BloqueDisponibilidad = require('../models/BloqueDisponibilidad');
const {
  normalizarPreferenciasRecordatorio,
  preferenciasRecordatorioPorDefecto,
} = require('../config/notificaciones');
const emailAdapter = require('./canales/email.adapter');
const whatsappAdapter = require('./canales/whatsapp.adapter');

const TIPO_RECORDATORIO = 'recordatorio';
const TIPO_RESUMEN = 'resumen_instructor';

function secretoToken() {
  return (
    process.env.NOTIFICACION_TOKEN_SECRET ||
    process.env.JWT_SECRET ||
    'notificaciones_desarrollo_secreto'
  );
}

function generarTokenAsistencia(reserva, opciones = {}) {
  return jwt.sign(
    { purpose: 'asistencia', reservaId: String(reserva?._id || '') },
    secretoToken(),
    { expiresIn: opciones.expiresIn || process.env.NOTIFICACION_TOKEN_TTL || '2h' }
  );
}

function verificarTokenAsistencia(token) {
  const payload = jwt.verify(token, secretoToken());
  if (payload?.purpose !== 'asistencia') {
    throw new Error('El token no corresponde a confirmación de asistencia');
  }
  return payload;
}

function fechaHoraInicio(reserva) {
  const fecha = reserva?.fecha;
  const hora = reserva?.bloque?.horaInicio;
  if (!fecha || !hora) return null;
  const valor = new Date(`${fecha}T${hora}:00`);
  return Number.isNaN(valor.getTime()) ? null : valor;
}

function formatearFechaHora(reserva) {
  const inicio = fechaHoraInicio(reserva);
  if (!inicio) return 'la fecha programada';
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: process.env.TZ || 'America/Bogota',
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(inicio);
}

function urlConfirmacion(token) {
  const base =
    process.env.BACKEND_PUBLIC_URL || `http://localhost:${process.env.PORT || 3000}`;
  return `${base.replace(/\/$/, '')}/api/notificaciones/confirmar-asistencia?token=${encodeURIComponent(
    token
  )}`;
}

function escaparHtml(valor) {
  return String(valor ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function tokenValido(token) {
  try {
    return verificarTokenAsistencia(token);
  } catch {
    return null;
  }
}

function obtenerPreferenciasRecordatorio(cliente) {
  const valor = cliente?.preferenciasRecordatorio || cliente;
  const preferencias = normalizarPreferenciasRecordatorio(valor);
  const tienePreferencias = Boolean(cliente?.preferenciasRecordatorio);

  if (!tienePreferencias && cliente && typeof cliente === 'object') {
    return preferenciasRecordatorioPorDefecto();
  }
  return preferencias;
}

function ttlTokenRecordatorio(minutosAnticipacion) {
  if (!minutosAnticipacion) return process.env.NOTIFICACION_TOKEN_TTL || '2h';
  return `${Math.ceil((Number(minutosAnticipacion) + 120) / 60)}h`;
}

function minutosAnticipacionReserva(reserva) {
  const preferencias = obtenerPreferenciasRecordatorio(reserva?.cliente);
  return preferencias.minutosAnticipacion;
}

async function persistirReserva(reserva) {
  if (reserva && typeof reserva.save === 'function') {
    await reserva.save();
  }
}

async function existeEnvioPrevio({ reserva, canal, tipo }) {
  if (!reserva?._id || typeof Notificacion.findOne !== 'function') return false;

  let consulta = Notificacion.findOne({
    reserva: reserva._id,
    tipo,
    canal,
    estado: 'enviado',
  });
  if (consulta && typeof consulta.lean === 'function') {
    consulta = consulta.lean();
  }
  const encontrada = await consulta;
  return Boolean(encontrada);
}

function esMock(fn) {
  return Boolean(fn && fn._isMockFunction);
}

function puedeRegistrar() {
  if (!Notificacion || typeof Notificacion.create !== 'function') return false;
  return esMock(Notificacion.create) || mongoose.connection.readyState === 1;
}

async function registrarNotificacion(datos) {
  if (!puedeRegistrar()) return null;
  try {
    return await Notificacion.create(datos);
  } catch {
    return null;
  }
}

function construirDatosCanales(reserva, token) {
  const cliente = reserva?.cliente || {};
  const clase = reserva?.clase?.nombre || 'tu clase';
  const recinto = reserva?.recinto?.nombre || 'el recinto';
  const cuando = formatearFechaHora(reserva);
  const enlace = urlConfirmacion(token);
  const texto = `Recordatorio: ${clase} en ${recinto}, ${cuando}. Confirma tu asistencia aquí: ${enlace}`;
  const asunto = `Recordatorio de ${clase}`;
  const html = `<p>Recordatorio de <strong>${escaparHtml(clase)}</strong> en ${escaparHtml(
    recinto
  )}.</p><p>Fecha: ${escaparHtml(cuando)}</p><p><a href="${escaparHtml(
    enlace
  )}">Confirmar asistencia</a></p>`;

  const preferencias = obtenerPreferenciasRecordatorio(cliente);
  if (!preferencias.activo) return [];
  const habilitados = new Set(preferencias.canales);
  const canales = [];

  if (habilitados.has('email') && cliente.correo) {
    canales.push({
      canal: 'email',
      destino: cliente.correo,
      asunto,
      texto,
      html,
      adapter: emailAdapter,
    });
  }
  if (habilitados.has('whatsapp') && cliente.telefono) {
    canales.push({
      canal: 'whatsapp',
      destino: cliente.telefono,
      mensaje: texto,
      adapter: whatsappAdapter,
    });
  }
  if (habilitados.has('navegacion') && (cliente._id || cliente)) {
    canales.push({
      canal: 'navegacion',
      destino: String(cliente._id || cliente),
      asunto,
      mensaje: texto,
      adapter: {
        enviar: async () => ({ estado: 'enviado', proveedorId: null }),
      },
    });
  }
  return canales;
}

async function enviarRecordatorio(reserva, opciones = {}) {
  if (!reserva) {
    return { resultados: [], mensaje: 'No existe la reserva' };
  }
  if (reserva.estado === 'cancelada') {
    return {
      resultados: [
        { canal: 'general', estado: 'omitido', motivo: 'La reserva está cancelada' },
      ],
    };
  }

  const minutosAnticipacion = minutosAnticipacionReserva(reserva);
  let token = reserva.tokenConfirmacion;
  let payload = tokenValido(token);
  if (!payload) {
    token = generarTokenAsistencia(reserva, {
      expiresIn: ttlTokenRecordatorio(minutosAnticipacion),
    });
    payload = verificarTokenAsistencia(token);
  }

  reserva.tokenConfirmacion = token;
  reserva.tokenExpiraEn = payload?.exp ? new Date(payload.exp * 1000) : null;
  await persistirReserva(reserva);

  const canales = construirDatosCanales(reserva, token);
  if (!canales.length) {
    await registrarNotificacion({
      reserva: reserva._id,
      destinatario: reserva.cliente?._id || reserva.cliente || null,
      tipo: TIPO_RECORDATORIO,
      canal: 'navegacion',
      destino: String(reserva.cliente?._id || reserva.cliente || ''),
      asunto: `Recordatorio de ${reserva.clase?.nombre || 'tu clase'}`,
      mensaje: 'El usuario no tiene canales de recordatorio activos o datos de contacto',
      estado: 'omitido',
      error: 'Sin canales de recordatorio activos',
      fechaEnvio: null,
      leida: false,
    });
    if (!reserva.recordatorioEnviado) {
      reserva.recordatorioEnviado = true;
      await persistirReserva(reserva);
    }
    return {
      token,
      resultados: [
        {
          canal: 'general',
          estado: 'omitido',
          motivo: 'El usuario no tiene canales de recordatorio activos o datos de contacto',
        },
      ],
    };
  }

  const resultados = await Promise.all(
    canales.map(async (configuracion) => {
      if (!opciones.forzar) {
        const yaEnviado = await existeEnvioPrevio({
          reserva,
          canal: configuracion.canal,
          tipo: TIPO_RECORDATORIO,
        });
        if (yaEnviado) {
          return {
            canal: configuracion.canal,
            destino: configuracion.destino,
            estado: 'omitido',
            motivo: 'Ya enviado previamente',
            yaEnviado: true,
          };
        }
      }

      try {
        const respuesta = await configuracion.adapter.enviar(configuracion);
        const estado = respuesta?.estado === 'omitido' ? 'omitido' : 'enviado';
        await registrarNotificacion({
          reserva: reserva._id,
          destinatario: reserva.cliente?._id || reserva.cliente || null,
          tipo: TIPO_RECORDATORIO,
          canal: configuracion.canal,
          destino: configuracion.destino,
          asunto: configuracion.asunto || '',
          mensaje: configuracion.texto || configuracion.mensaje || '',
          estado,
          proveedorId: respuesta?.proveedorId || null,
          error: respuesta?.motivo || null,
          fechaEnvio: estado === 'enviado' ? new Date() : null,
        });
        return {
          canal: configuracion.canal,
          destino: configuracion.destino,
          estado,
          proveedorId: respuesta?.proveedorId || null,
          motivo: respuesta?.motivo || null,
        };
      } catch (err) {
        await registrarNotificacion({
          reserva: reserva._id,
          destinatario: reserva.cliente?._id || reserva.cliente || null,
          tipo: TIPO_RECORDATORIO,
          canal: configuracion.canal,
          destino: configuracion.destino,
          asunto: configuracion.asunto || '',
          mensaje: configuracion.texto || configuracion.mensaje || '',
          estado: 'fallido',
          error: err.message,
          fechaEnvio: null,
        });
        return {
          canal: configuracion.canal,
          destino: configuracion.destino,
          estado: 'fallido',
          error: err.message,
        };
      }
    })
  );

  const huboExito = resultados.some(
    (resultado) => resultado.estado === 'enviado' || resultado.yaEnviado
  );
  if (huboExito && !reserva.recordatorioEnviado) {
    reserva.recordatorioEnviado = true;
    await persistirReserva(reserva);
  }

  return { token, resultados };
}

async function reenviarNotificacion(id) {
  if (!Notificacion || typeof Notificacion.findById !== 'function') {
    throw new Error('El modelo de notificaciones no está disponible');
  }

  let consulta = Notificacion.findById(id);
  if (typeof consulta.populate === 'function') {
    consulta = consulta.populate({
      path: 'reserva',
      populate: [
        { path: 'cliente' },
        { path: 'recinto' },
        { path: 'clase' },
        { path: 'bloque' },
      ],
    });
  }
  const notificacion = await consulta;
  if (!notificacion) {
    throw new Error('No se encontró la notificación');
  }
  if (String(notificacion.estado) === 'enviado') {
    throw new Error('La notificación ya fue enviada correctamente');
  }

  const reserva = notificacion.reserva;
  if (!reserva || typeof reserva !== 'object') {
    throw new Error('La notificación no tiene una reserva asociada');
  }

  let token = reserva.tokenConfirmacion;
  if (!tokenValido(token)) {
    token = generarTokenAsistencia(reserva, {
      expiresIn: ttlTokenRecordatorio(minutosAnticipacionReserva(reserva)),
    });
    reserva.tokenConfirmacion = token;
    reserva.tokenExpiraEn = new Date(verificarTokenAsistencia(token).exp * 1000);
    await persistirReserva(reserva);
  }

  const canal = construirDatosCanales(reserva, token).find(
    (item) => item.canal === notificacion.canal
  );
  if (!canal) {
    throw new Error('No hay destinatario disponible para reenviar la notificación');
  }

  try {
    const respuesta = await canal.adapter.enviar(canal);
    if (respuesta?.estado === 'omitido') {
      throw new Error(respuesta.motivo || 'No se pudo reenviar la notificación');
    }

    await registrarNotificacion({
      reserva: reserva._id,
      destinatario: reserva.cliente?._id || reserva.cliente || null,
      tipo: notificacion.tipo,
      canal: notificacion.canal,
      destino: canal.destino,
      asunto: canal.asunto || '',
      mensaje: canal.texto || canal.mensaje || '',
      estado: 'enviado',
      proveedorId: respuesta?.proveedorId || null,
      error: null,
      fechaEnvio: new Date(),
    });

    notificacion.estado = 'enviado';
    notificacion.error = null;
    notificacion.fechaEnvio = new Date();
    if (typeof notificacion.save === 'function') await notificacion.save();

    return { canal: notificacion.canal, estado: 'enviado' };
  } catch (err) {
    await registrarNotificacion({
      reserva: reserva._id,
      destinatario: reserva.cliente?._id || reserva.cliente || null,
      tipo: notificacion.tipo,
      canal: notificacion.canal,
      destino: canal.destino,
      asunto: canal.asunto || '',
      mensaje: canal.texto || canal.mensaje || '',
      estado: 'fallido',
      error: err.message,
      fechaEnvio: null,
    });
    throw err;
  }
}

async function construirResumenInstructor(instructorId) {
  if (!instructorId) return null;
  const bloques = await BloqueDisponibilidad.find({ instructor: instructorId })
    .select('_id')
    .lean();
  const ids = Array.isArray(bloques) ? bloques.map((bloque) => bloque._id) : [];
  const filtro = { bloque: { $in: ids }, estado: { $in: ['pendiente', 'confirmada', 'cancelada'] } };

  const [pendientes, confirmadas, canceladas] = await Promise.all([
    Reserva.countDocuments({ ...filtro, estado: 'pendiente' }),
    Reserva.countDocuments({ ...filtro, estado: 'confirmada' }),
    Reserva.countDocuments({ ...filtro, estado: 'cancelada' }),
  ]);

  return {
    pendientes,
    confirmadas,
    canceladas,
    total: pendientes + confirmadas + canceladas,
  };
}

async function enviarResumenInstructor(instructor, resumen) {
  const datos = [];
  const mensaje = `Resumen de reservas: ${resumen.total} en total, ${resumen.confirmadas} confirmadas, ${resumen.pendientes} pendientes y ${resumen.canceladas} canceladas.`;

  if (instructor?.correo) {
    datos.push({
      canal: 'email',
      destino: instructor.correo,
      asunto: 'Resumen de reservas del instructor',
      texto: mensaje,
      adapter: emailAdapter,
    });
  }
  if (instructor?.telefono) {
    datos.push({
      canal: 'whatsapp',
      destino: instructor.telefono,
      mensaje,
      adapter: whatsappAdapter,
    });
  }

  return Promise.all(
    datos.map(async (configuracion) => {
      try {
        const respuesta = await configuracion.adapter.enviar(configuracion);
        const estado = respuesta?.estado === 'omitido' ? 'omitido' : 'enviado';
        await registrarNotificacion({
          reserva: null,
          destinatario: instructor?._id || null,
          tipo: TIPO_RESUMEN,
          canal: configuracion.canal,
          destino: configuracion.destino,
          asunto: configuracion.asunto || '',
          mensaje: mensaje,
          estado,
          proveedorId: respuesta?.proveedorId || null,
          error: respuesta?.motivo || null,
          fechaEnvio: estado === 'enviado' ? new Date() : null,
        });
        return { canal: configuracion.canal, estado };
      } catch (err) {
        await registrarNotificacion({
          reserva: null,
          destinatario: instructor?._id || null,
          tipo: TIPO_RESUMEN,
          canal: configuracion.canal,
          destino: configuracion.destino,
          asunto: configuracion.asunto || '',
          mensaje: mensaje,
          estado: 'fallido',
          error: err.message,
          fechaEnvio: null,
        });
        return { canal: configuracion.canal, estado: 'fallido', error: err.message };
      }
    })
  );
}

async function enviarBienvenida(usuario) {
  if (!usuario) return [];
  const mensaje = `Bienvenido a FitBook, ${usuario.correo || 'nuevo usuario'}. Tu cuenta quedó creada correctamente.`;
  const canales = [];

  if (usuario.correo) {
    canales.push({
      canal: 'email',
      destino: usuario.correo,
      asunto: 'Bienvenida a FitBook',
      texto: mensaje,
      adapter: emailAdapter,
    });
  }
  if (usuario.telefono) {
    canales.push({
      canal: 'whatsapp',
      destino: usuario.telefono,
      mensaje,
      adapter: whatsappAdapter,
    });
  }

  return Promise.all(
    canales.map(async (configuracion) => {
      try {
        const respuesta = await configuracion.adapter.enviar(configuracion);
        const estado = respuesta?.estado === 'omitido' ? 'omitido' : 'enviado';
        await registrarNotificacion({
          reserva: null,
          destinatario: usuario._id || null,
          tipo: 'sistema',
          canal: configuracion.canal,
          destino: configuracion.destino,
          asunto: configuracion.asunto || '',
          mensaje,
          estado,
          proveedorId: respuesta?.proveedorId || null,
          error: respuesta?.motivo || null,
          fechaEnvio: estado === 'enviado' ? new Date() : null,
          leida: false,
        });
        return { canal: configuracion.canal, estado };
      } catch (err) {
        await registrarNotificacion({
          reserva: null,
          destinatario: usuario._id || null,
          tipo: 'sistema',
          canal: configuracion.canal,
          destino: configuracion.destino,
          asunto: configuracion.asunto || '',
          mensaje,
          estado: 'fallido',
          error: err.message,
          fechaEnvio: null,
          leida: false,
        });
        return { canal: configuracion.canal, estado: 'fallido', error: err.message };
      }
    })
  );
}

async function registrarNotificacionNavegacion({
  destinatario,
  mensaje,
  asunto = '',
  tipo = 'sistema',
  reserva = null,
}) {
  if (!destinatario || !mensaje) return null;
  return registrarNotificacion({
    reserva,
    destinatario,
    tipo,
    canal: 'navegacion',
    destino: String(destinatario),
    asunto,
    mensaje,
    estado: 'enviado',
    proveedorId: null,
    error: null,
    fechaEnvio: new Date(),
    leida: false,
  });
}

async function listarNotificacionesNavegacion(destinatario) {
  if (!destinatario || typeof Notificacion.find !== 'function') return [];
  let consulta = Notificacion.find({ destinatario, canal: 'navegacion' });
  if (consulta && typeof consulta.sort === 'function') {
    consulta = consulta.sort({ createdAt: -1 });
  }
  if (consulta && typeof consulta.limit === 'function') {
    consulta = consulta.limit(20);
  }
  const resultados = await consulta;
  return Array.isArray(resultados) ? resultados : [];
}

function huellaToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

module.exports = {
  generarTokenAsistencia,
  verificarTokenAsistencia,
  obtenerPreferenciasRecordatorio,
  minutosAnticipacionReserva,
  ttlTokenRecordatorio,
  fechaHoraInicio,
  enviarRecordatorio,
  reenviarNotificacion,
  construirResumenInstructor,
  enviarResumenInstructor,
  enviarBienvenida,
  registrarNotificacionNavegacion,
  listarNotificacionesNavegacion,
  huellaToken,
};
