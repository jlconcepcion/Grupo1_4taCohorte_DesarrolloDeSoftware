const mongoose = require('mongoose');
const Reserva = require('../models/Reserva');
const { ESTADOS_RESERVA } = require('../models/Reserva');
const BloqueDisponibilidad = require('../models/BloqueDisponibilidad');
const Recinto = require('../models/Recinto');
const Clase = require('../models/Clase');
const User = require('../models/User');
const {
  registrarNotificacionNavegacion,
} = require('../services/notificaciones.service');

const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const colasPorCupo = new Map();

function esFechaCalendarioValida(fechaStr) {
  if (!FECHA_REGEX.test(fechaStr)) return false;
  const [anio, mes, dia] = String(fechaStr).split('-').map(Number);
  const dt = new Date(Date.UTC(anio, mes - 1, dia, 12, 0, 0));
  return (
    dt.getUTCFullYear() === anio &&
    dt.getUTCMonth() === mes - 1 &&
    dt.getUTCDate() === dia
  );
}

function esFechaFutura(fechaStr) {
  const [anio, mes, dia] = String(fechaStr).split('-').map(Number);
  const fecha = new Date(anio, mes - 1, dia, 0, 0, 0, 0);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return fecha.getTime() >= hoy.getTime();
}

function hayTransacciones() {
  const uri = String(process.env.MONGODB_URI || '');
  return uri.includes('mongodb+srv://') || uri.includes('replicaSet=');
}

function conSesion(consulta, session) {
  return session && consulta && typeof consulta.session === 'function'
    ? consulta.session(session)
    : consulta;
}

function opcionesSesion(session) {
  return session ? { session } : {};
}

async function ejecutarEnTransaccion(tarea) {
  if (
    hayTransacciones() &&
    mongoose.connection &&
    mongoose.connection.readyState === 1 &&
    typeof mongoose.startSession === 'function'
  ) {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      const resultado = await tarea(session);
      await session.commitTransaction();
      return resultado;
    } catch (err) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      throw err;
    } finally {
      await session.endSession();
    }
  }
  return tarea(null);
}

async function ejecutarConBloqueo(clave, tarea) {
  const previa = colasPorCupo.get(clave) || Promise.resolve();
  let liberar;
  const actual = new Promise((resolve) => {
    liberar = resolve;
  });
  const encadenada = previa.then(() => actual);
  colasPorCupo.set(clave, encadenada);

  await previa;
  try {
    return await tarea();
  } finally {
    liberar();
    if (colasPorCupo.get(clave) === encadenada) {
      colasPorCupo.delete(clave);
    }
  }
}

function obtenerDiaSemanaDeFecha(fechaStr) {
  if (!esFechaCalendarioValida(fechaStr)) return null;
  const [anio, mes, dia] = String(fechaStr).split('-').map(Number);
  const dt = new Date(Date.UTC(anio, mes - 1, dia, 12, 0, 0));
  if (Number.isNaN(dt.getTime())) return null;
  return dt.getUTCDay();
}

function construirFechaHoraLocal(fechaStr, horaStr = '00:00') {
  const [anio, mes, dia] = String(fechaStr).split('-').map(Number);
  const [hh, mm] = String(horaStr || '00:00')
    .split(':')
    .map(Number);
  return new Date(anio, (mes || 1) - 1, dia || 1, hh || 0, mm || 0, 0, 0);
}

async function obtenerHoraInicioReserva(reserva) {
  if (reserva.bloque?.horaInicio) return reserva.bloque.horaInicio;
  const bloqueId = reserva.bloque?._id || reserva.bloque;
  if (!bloqueId) return null;
  const bloque = await BloqueDisponibilidad.findById(bloqueId);
  return bloque?.horaInicio || null;
}

async function sincronizarContadorBloque(bloqueId, session) {
  const conteo = await Reserva.countDocuments(
    {
      bloque: bloqueId,
      estado: { $in: ['pendiente', 'confirmada'] },
    },
    opcionesSesion(session)
  );
  const total = Number(conteo || 0);
  const bloque = await conSesion(BloqueDisponibilidad.findById(bloqueId), session);
  if (!bloque) return;

  bloque.reservasActivas = total;
  if (typeof bloque.save === 'function') {
    await bloque.save(opcionesSesion(session));
  } else if (typeof BloqueDisponibilidad.updateOne === 'function') {
    await BloqueDisponibilidad.updateOne(
      { _id: bloqueId },
      { $set: { reservasActivas: total } },
      opcionesSesion(session)
    );
  }
}

async function poblarReservas(consulta) {
  if (consulta && typeof consulta.populate === 'function') {
    return consulta
      .populate('cliente', 'correo rol activo')
      .populate({
        path: 'bloque',
        select: 'diaSemana horaInicio horaFin capacidad instructor clase recinto',
        populate: { path: 'instructor', select: 'correo rol' },
      })
      .populate('recinto', 'nombre tipo capacidad activo')
      .populate('clase', 'nombre tipoRutina instructor')
      .populate('gestionadoPor', 'correo rol');
  }
  return consulta;
}

// ============================================================================
// GET /api/reservas/disponibilidad (HU10, ST03.03)
// ============================================================================
async function consultarDisponibilidad(req, res) {
  try {
    const { fecha, recinto, clase, instructor } = req.query || {};

    if (fecha !== undefined && fecha !== '' && !esFechaCalendarioValida(fecha)) {
      return res.status(400).json({ mensaje: 'El formato de fecha debe ser YYYY-MM-DD' });
    }
    if (fecha && !esFechaFutura(fecha)) {
      return res.status(400).json({ mensaje: 'La fecha debe ser futura o el día de hoy' });
    }

    const filtroBloques = {};
    if (fecha) {
      const diaSemana = obtenerDiaSemanaDeFecha(fecha);
      if (diaSemana === null) {
        return res.status(400).json({ mensaje: 'Fecha inválida' });
      }
      filtroBloques.diaSemana = diaSemana;
    }
    if (recinto) filtroBloques.recinto = recinto;
    if (clase) filtroBloques.clase = clase;
    if (instructor) filtroBloques.instructor = instructor;

    const consulta = BloqueDisponibilidad.find(filtroBloques);
    const bloques =
      consulta && typeof consulta.populate === 'function'
        ? await consulta
            .populate('recinto', 'nombre tipo capacidad activo')
            .populate('clase', 'nombre tipoRutina activa')
            .populate('instructor', 'correo rol')
        : await consulta;

    const disponibles = [];

    for (const b of bloques || []) {
      // Excluir recintos inactivos o clases inactivas (HU10)
      if (b.recinto && b.recinto.activo === false) continue;
      if (b.clase && b.clase.activa === false) continue;

      const filtroReserva = {
        bloque: b._id,
        estado: { $in: ['pendiente', 'confirmada'] },
      };
      if (fecha) {
        filtroReserva.fecha = fecha;
      }

      const ocupados = await Reserva.countDocuments(filtroReserva);
      const capacidad = Number(b.capacidad || 0);
      const cuposLibres = Math.max(0, capacidad - Number(ocupados || 0));

      // Excluir bloques llenos (HU10, ST03.03)
      if (cuposLibres <= 0) continue;

      disponibles.push({
        _id: b._id,
        bloqueId: b._id,
        fecha: fecha || null,
        diaSemana: b.diaSemana,
        horaInicio: b.horaInicio,
        horaFin: b.horaFin,
        capacidad,
        cuposOcupados: Number(ocupados || 0),
        cuposLibres,
        recinto: b.recinto,
        clase: b.clase,
        instructor: b.instructor,
      });
    }

    return res.json(disponibles);
  } catch (err) {
    return res.status(500).json({ mensaje: 'Error al consultar la disponibilidad' });
  }
}

// ============================================================================
// POST /api/reservas (HU11, ST03.05)
// ============================================================================
async function crearReserva(req, res) {
  const { bloqueId, bloque: bloqueBody, fecha } = req.body || {};
  const idBloque = bloqueId || bloqueBody;

  const errores = [];
  if (!idBloque) errores.push('El bloque de horario es obligatorio');
  if (!fecha || !esFechaCalendarioValida(String(fecha).trim())) {
    errores.push('La fecha es obligatoria y debe tener formato YYYY-MM-DD');
  } else if (!esFechaFutura(String(fecha).trim())) {
    errores.push('La fecha debe ser futura o el día de hoy');
  }

  if (errores.length) {
    return res.status(400).json({ mensaje: errores[0], errores });
  }

  const fechaLimpia = String(fecha).trim();
  const claveConcurrencia = `${idBloque}:${fechaLimpia}`;

  let resultado;
  try {
    resultado = await ejecutarConBloqueo(claveConcurrencia, async () =>
      ejecutarEnTransaccion(async (session) => {
        try {
          const bloqueDoc = await conSesion(
            BloqueDisponibilidad.findById(idBloque),
            session
          );
          if (!bloqueDoc) {
            return { status: 404, body: { mensaje: 'El bloque de horario no existe' } };
          }

          const recintoId = bloqueDoc.recinto?._id || bloqueDoc.recinto;
          const recintoDoc = await conSesion(Recinto.findById(recintoId), session);
          if (!recintoDoc || recintoDoc.activo === false) {
            return {
              status: 400,
              body: { mensaje: 'El recinto asociado a este horario no está disponible' },
            };
          }

          if (bloqueDoc.clase) {
            const claseId = bloqueDoc.clase?._id || bloqueDoc.clase;
            const claseDoc = await conSesion(Clase.findById(claseId), session);
            if (claseDoc && claseDoc.activa === false) {
              return {
                status: 400,
                body: { mensaje: 'La clase asociada a este horario no está disponible' },
              };
            }
          }

          const diaFecha = obtenerDiaSemanaDeFecha(fechaLimpia);
          if (
            bloqueDoc.diaSemana !== undefined &&
            diaFecha !== null &&
            Number(bloqueDoc.diaSemana) !== diaFecha
          ) {
            return {
              status: 400,
              body: {
                mensaje: 'La fecha seleccionada no corresponde al día de la semana del bloque',
              },
            };
          }

          const duplicada = await conSesion(
            Reserva.findOne({
              bloque: bloqueDoc._id || idBloque,
              fecha: fechaLimpia,
              cliente: req.user.id,
              estado: { $in: ['pendiente', 'confirmada'] },
            }),
            session
          );

          if (duplicada) {
            return {
              status: 409,
              body: { mensaje: 'Ya tienes una reserva activa para este bloque y fecha' },
            };
          }

          const reservasActivas = await Reserva.countDocuments(
            {
              bloque: bloqueDoc._id || idBloque,
              fecha: fechaLimpia,
              estado: { $in: ['pendiente', 'confirmada'] },
            },
            opcionesSesion(session)
          );

          if (Number(reservasActivas) >= Number(bloqueDoc.capacidad)) {
            return {
              status: 409,
              body: { mensaje: 'El bloque ya no tiene cupos disponibles para esta fecha' },
            };
          }

          const datosReserva = {
            cliente: req.user.id,
            bloque: bloqueDoc._id || idBloque,
            recinto: recintoId,
            clase: bloqueDoc.clase?._id || bloqueDoc.clase || null,
            fecha: fechaLimpia,
            estado: 'pendiente',
          };

          const nuevaReserva = session
            ? (await Reserva.create([datosReserva], { session }))[0]
            : await Reserva.create(datosReserva);

          if (typeof BloqueDisponibilidad.updateOne === 'function') {
            await BloqueDisponibilidad.updateOne(
              { _id: bloqueDoc._id || idBloque },
              { $inc: { reservasActivas: 1 } },
              opcionesSesion(session)
            );
          }
          await sincronizarContadorBloque(bloqueDoc._id || idBloque, session);
          return { status: 201, body: nuevaReserva };
        } catch (err) {
          console.error('Error al registrar la reserva:', err.message, err.code);
          if (err.code === 11000) {
            return {
              status: 409,
              body: {
                mensaje: 'Ya existe una reserva activa para este cliente en el mismo bloque y fecha',
              },
            };
          }
          return { status: 500, body: { mensaje: 'Error al registrar la reserva' } };
        }
      })
    );
  } catch (err) {
    console.error('Error al registrar la reserva:', err.message, err.code);
    return res.status(500).json({ mensaje: 'Error al registrar la reserva' });
  }

  return res.status(resultado.status).json(resultado.body);
}

// ============================================================================
// GET /api/reservas/mias (HU13)
// ============================================================================
async function listarMisReservas(req, res) {
  try {
    const tipo = req.query?.tipo || 'todas'; // 'proximas' | 'pasadas' | 'todas'
    const consulta = Reserva.find({ cliente: req.user.id });
    const reservas = await poblarReservas(consulta);
    const lista = Array.isArray(reservas) ? reservas : [];

    const ahora = new Date();
    const enriquecidas = lista.map((r) => {
      const obj = typeof r.toJSON === 'function' ? r.toJSON() : { ...r };
      const horaFin = obj.bloque?.horaFin || '23:59';
      const finDt = construirFechaHoraLocal(obj.fecha, horaFin);
      const esPasada = finDt.getTime() < ahora.getTime();
      return { ...obj, esPasada };
    });

    enriquecidas.sort((a, b) => {
      const cmpFecha = String(a.fecha).localeCompare(String(b.fecha));
      if (cmpFecha !== 0) return cmpFecha;
      return String(a.bloque?.horaInicio || '').localeCompare(
        String(b.bloque?.horaInicio || '')
      );
    });

    if (tipo === 'proximas') {
      return res.json(enriquecidas.filter((r) => !r.esPasada));
    }
    if (tipo === 'pasadas') {
      return res.json(enriquecidas.filter((r) => r.esPasada));
    }

    return res.json(enriquecidas);
  } catch (err) {
    return res.status(500).json({ mensaje: 'Error al consultar tus reservas' });
  }
}

// ============================================================================
// PATCH /api/reservas/:id/confirmar-asistencia (HU14)
// ============================================================================
async function confirmarAsistenciaCliente(req, res) {
  const { id } = req.params;

  try {
    const consulta = Reserva.findById(id);
    const reserva = await poblarReservas(consulta);
    if (!reserva) {
      return res.status(404).json({ mensaje: 'Reserva no encontrada' });
    }

    const clienteId = reserva.cliente?._id || reserva.cliente;
    if (String(clienteId) !== String(req.user.id)) {
      return res.status(403).json({ mensaje: 'Solo puedes confirmar tus propias reservas' });
    }

    if (reserva.estado === 'cancelada') {
      return res
        .status(409)
        .json({ mensaje: 'No se puede confirmar una reserva que fue cancelada' });
    }

    // HU14: Acción idempotente si ya está confirmada
    if (reserva.estado === 'confirmada') {
      return res.json(reserva);
    }

    // HU14: Validar límite de 1 hora antes del inicio del bloque
    const horaInicio = await obtenerHoraInicioReserva(reserva);
    if (!horaInicio) {
      return res.status(409).json({ mensaje: 'No se pudo determinar el horario de la reserva' });
    }
    const inicioDt = construirFechaHoraLocal(reserva.fecha, horaInicio);
    const msRestantes = inicioDt.getTime() - Date.now();

    if (msRestantes < 60 * 60 * 1000) {
      return res.status(409).json({
        mensaje:
          'El tiempo límite para confirmar asistencia venció (debe confirmarse al menos 1 hora antes del inicio)',
      });
    }

    reserva.estado = 'confirmada';
    reserva.fechaConfirmacion = new Date();
    reserva.gestionadoPor = req.user.id;

    if (typeof reserva.save === 'function') {
      await reserva.save();
    }
    return res.json(reserva);
  } catch (err) {
    return res.status(500).json({ mensaje: 'Error al confirmar la asistencia' });
  }
}

async function notificarCancelacion(reserva, actor) {
  const clienteId = reserva?.cliente?._id || reserva?.cliente;
  const clienteCorreo = reserva?.cliente?.correo || 'el cliente';
  const actorId = actor?.id || actor?._id;
  let actorCorreo = actor?.correo;
  let actorRol = actor?.rol;

  if (!actorCorreo && actorId && typeof User.findById === 'function') {
    try {
      let consulta = User.findById(actorId);
      if (consulta && typeof consulta.select === 'function') {
        consulta = consulta.select('correo rol');
      }
      const usuario = await consulta;
      actorCorreo = usuario?.correo;
      actorRol = usuario?.rol;
    } catch (err) {
      actorCorreo = null;
    }
  }

  const responsable = actorCorreo || actorRol || 'un administrador';
  const clase = reserva?.clase?.nombre || 'la clase';
  const fecha = reserva?.fecha || '';
  const motivo = reserva?.motivoCancelacion
    ? ` Motivo: ${reserva.motivoCancelacion}.`
    : '';
  const referencia = `${clase}${fecha ? ` del ${fecha}` : ''}`;
  const destinatarios = new Map();

  if (clienteId) {
    const cancellationBySelf = String(clienteId) === String(actorId);
    destinatarios.set(String(clienteId), {
      asunto: 'Reserva cancelada',
      mensaje: cancellationBySelf
        ? `Cancelaste tu reserva de ${referencia}.${motivo}`
        : `Tu reserva de ${referencia} fue cancelada por ${responsable}.${motivo}`,
    });
  }

  if (actorId && !destinatarios.has(String(actorId))) {
    destinatarios.set(String(actorId), {
      asunto: 'Cancelación registrada',
      mensaje: `Cancelaste la reserva de ${clienteCorreo} para ${referencia}.${motivo}`,
    });
  }

  await Promise.all(
    [...destinatarios].map(([destinatario, contenido]) =>
      registrarNotificacionNavegacion({
        destinatario,
        asunto: contenido.asunto,
        mensaje: contenido.mensaje,
        reserva: reserva?._id || null,
      }).catch(() => null)
    )
  );
}

// ============================================================================
// PATCH /api/reservas/:id/cancelar-propia (HU12, ST03.06)
// ============================================================================
async function cancelarReservaPropia(req, res) {
  const { id } = req.params;

  try {
    const consulta = Reserva.findById(id);
    const reserva = await poblarReservas(consulta);
    if (!reserva) {
      return res.status(404).json({ mensaje: 'Reserva no encontrada' });
    }

    const clienteId = reserva.cliente?._id || reserva.cliente;
    if (String(clienteId) !== String(req.user.id)) {
      return res
        .status(403)
        .json({ mensaje: 'No puedes cancelar la reserva de otro usuario' });
    }

    if (reserva.estado === 'cancelada') {
      return res.status(409).json({ mensaje: 'La reserva ya se encuentra cancelada' });
    }

    // HU12: Solo se puede cancelar antes del inicio del bloque
    const horaInicio = await obtenerHoraInicioReserva(reserva);
    if (!horaInicio) {
      return res.status(409).json({ mensaje: 'No se pudo determinar el horario de la reserva' });
    }
    const inicioDt = construirFechaHoraLocal(reserva.fecha, horaInicio);
    if (inicioDt.getTime() <= Date.now()) {
      return res.status(409).json({
        mensaje: 'No se puede cancelar una reserva después del inicio del bloque',
      });
    }

    reserva.estado = 'cancelada';
    reserva.fechaCancelacion = new Date();
    reserva.gestionadoPor = req.user.id;
    if (req.body?.motivo) {
      reserva.motivoCancelacion = String(req.body.motivo).trim();
    }

    if (typeof reserva.save === 'function') {
      await reserva.save();
    }

    const bloqueId = reserva.bloque?._id || reserva.bloque;
    await sincronizarContadorBloque(bloqueId);
    await notificarCancelacion(reserva, req.user);

    return res.json(reserva);
  } catch (err) {
    return res.status(500).json({ mensaje: 'Error al cancelar la reserva' });
  }
}

// ============================================================================
// GET /api/reservas (HU15, ST03.07 · Coordinador y Administrador)
// ============================================================================
async function listarReservas(req, res) {
  try {
    const { fecha, recinto, clase, instructor, estado } = req.query || {};

    if (fecha && !esFechaCalendarioValida(fecha)) {
      return res.status(400).json({ mensaje: 'El formato de fecha debe ser YYYY-MM-DD' });
    }
    if (fecha && !esFechaFutura(fecha)) {
      return res.status(400).json({ mensaje: 'La fecha debe ser futura o el día de hoy' });
    }
    if (estado && !ESTADOS_RESERVA.includes(estado)) {
      return res.status(400).json({ mensaje: 'El estado indicado no es válido' });
    }

    const filtro = {};
    if (fecha) filtro.fecha = fecha;
    if (recinto) filtro.recinto = recinto;
    if (clase) filtro.clase = clase;
    if (estado) filtro.estado = estado;

    const consulta = Reserva.find(filtro);
    let reservas = await poblarReservas(consulta);
    reservas = Array.isArray(reservas) ? reservas : [];

    if (instructor) {
      reservas = reservas.filter((r) => {
        const instBloque = r.bloque?.instructor?._id || r.bloque?.instructor;
        const instClase = r.clase?.instructor?._id || r.clase?.instructor;
        return (
          String(instBloque || '') === String(instructor) ||
          String(instClase || '') === String(instructor)
        );
      });
    }

    // Ordenar por fecha y hora de inicio (HU15)
    reservas.sort((a, b) => {
      const cmpFecha = String(a.fecha || '').localeCompare(String(b.fecha || ''));
      if (cmpFecha !== 0) return cmpFecha;
      return String(a.bloque?.horaInicio || '').localeCompare(
        String(b.bloque?.horaInicio || '')
      );
    });

    return res.json(reservas);
  } catch (err) {
    return res.status(500).json({ mensaje: 'Error al consultar el listado de reservas' });
  }
}

// ============================================================================
// PATCH /api/reservas/:id/confirmar (HU16, ST03.08 · Coordinador y Administrador)
// ============================================================================
async function confirmarReservaCoordinador(req, res) {
  const { id } = req.params;

  try {
    const consulta = Reserva.findById(id);
    const reserva = await poblarReservas(consulta);
    if (!reserva) {
      return res.status(404).json({ mensaje: 'Reserva no encontrada' });
    }

    if (reserva.estado === 'cancelada') {
      return res
        .status(409)
        .json({ mensaje: 'No se puede confirmar una reserva cancelada' });
    }

    if (reserva.estado === 'confirmada') {
      return res.json(reserva);
    }

    if (reserva.estado !== 'pendiente') {
      return res
        .status(409)
        .json({ mensaje: 'Solo se pueden confirmar reservas en estado pendiente' });
    }

    reserva.estado = 'confirmada';
    reserva.gestionadoPor = req.user.id;
    reserva.fechaConfirmacion = new Date();

    if (typeof reserva.save === 'function') {
      await reserva.save();
    }

    return res.json(reserva);
  } catch (err) {
    return res.status(500).json({ mensaje: 'Error al confirmar la reserva' });
  }
}

// ============================================================================
// PATCH /api/reservas/:id/cancelar (HU17, ST03.08 · Coordinador y Administrador)
// ============================================================================
async function cancelarReservaCoordinador(req, res) {
  const { id } = req.params;
  const { motivo } = req.body || {};

  try {
    const consulta = Reserva.findById(id);
    const reserva = await poblarReservas(consulta);
    if (!reserva) {
      return res.status(404).json({ mensaje: 'Reserva no encontrada' });
    }

    if (reserva.estado === 'cancelada') {
      return res.status(409).json({ mensaje: 'La reserva ya se encuentra cancelada' });
    }

    reserva.estado = 'cancelada';
    reserva.gestionadoPor = req.user.id;
    reserva.fechaCancelacion = new Date();
    if (motivo !== undefined) {
      reserva.motivoCancelacion = String(motivo).trim();
    }

    if (typeof reserva.save === 'function') {
      await reserva.save();
    }

    const bloqueId = reserva.bloque?._id || reserva.bloque;
    await sincronizarContadorBloque(bloqueId);
    await notificarCancelacion(reserva, req.user);

    return res.json(reserva);
  } catch (err) {
    return res.status(500).json({ mensaje: 'Error al cancelar la reserva' });
  }
}

// ============================================================================
// PATCH /api/reservas/:id/reasignar (ST03.10 · Exclusivo Administrador)
// ============================================================================
async function reasignarReservaAdmin(req, res) {
  const { id } = req.params;
  const { nuevoBloqueId, nuevaFecha, nuevoClienteId } = req.body || {};

  try {
    const reserva = await Reserva.findById(id);
    if (!reserva) {
      return res.status(404).json({ mensaje: 'Reserva no encontrada' });
    }

    const bloqueAnteriorId = reserva.bloque?._id || reserva.bloque;
    const bloqueDestinoId = nuevoBloqueId || bloqueAnteriorId;
    const fechaDestino = nuevaFecha ? String(nuevaFecha).trim() : reserva.fecha;

    if (!bloqueDestinoId) {
      return res.status(400).json({ mensaje: 'El bloque de destino es obligatorio' });
    }
    if (!esFechaCalendarioValida(fechaDestino)) {
      return res.status(400).json({ mensaje: 'El formato de fecha debe ser YYYY-MM-DD' });
    }
    if (!esFechaFutura(fechaDestino)) {
      return res.status(400).json({ mensaje: 'La fecha debe ser futura o el día de hoy' });
    }

    let resultado;
    try {
      resultado = await ejecutarConBloqueo(`${bloqueDestinoId}:${fechaDestino}`, async () =>
        ejecutarEnTransaccion(async (session) => {
          try {
            const bloqueDestino = await conSesion(
              BloqueDisponibilidad.findById(bloqueDestinoId),
              session
            );
            if (!bloqueDestino) {
              return { status: 404, body: { mensaje: 'El bloque de destino no existe' } };
            }

            const recintoId = bloqueDestino.recinto?._id || bloqueDestino.recinto;
            if (recintoId) {
              const recintoDoc = await conSesion(Recinto.findById(recintoId), session);
              if (recintoDoc && recintoDoc.activo === false) {
                return {
                  status: 400,
                  body: { mensaje: 'El recinto de destino no está disponible' },
                };
              }
            }

            if (bloqueDestino.clase) {
              const claseId = bloqueDestino.clase?._id || bloqueDestino.clase;
              const claseDoc = await conSesion(Clase.findById(claseId), session);
              if (claseDoc && claseDoc.activa === false) {
                return {
                  status: 400,
                  body: { mensaje: 'La clase de destino no está disponible' },
                };
              }
            }

            const hayCambioHorario =
              String(bloqueDestinoId) !== String(bloqueAnteriorId) ||
              fechaDestino !== reserva.fecha;
            const diaFecha = obtenerDiaSemanaDeFecha(fechaDestino);
            if (
              hayCambioHorario &&
              bloqueDestino.diaSemana !== undefined &&
              diaFecha !== null &&
              Number(bloqueDestino.diaSemana) !== diaFecha
            ) {
              return {
                status: 400,
                body: {
                  mensaje: 'La fecha no corresponde al día de la semana del bloque de destino',
                },
              };
            }

            if (hayCambioHorario) {
              const ocupadosDestino = await Reserva.countDocuments(
                {
                  bloque: bloqueDestino._id || bloqueDestinoId,
                  fecha: fechaDestino,
                  estado: { $in: ['pendiente', 'confirmada'] },
                },
                opcionesSesion(session)
              );

              if (Number(ocupadosDestino) >= Number(bloqueDestino.capacidad)) {
                return {
                  status: 409,
                  body: { mensaje: 'El bloque de destino no tiene cupos disponibles' },
                };
              }
            }

            if (nuevoClienteId) {
              const nuevoCliente = await conSesion(User.findById(nuevoClienteId), session);
              if (!nuevoCliente) {
                return { status: 404, body: { mensaje: 'El cliente de destino no existe' } };
              }
              if (nuevoCliente.activo === false) {
                return {
                  status: 400,
                  body: { mensaje: 'El cliente de destino no está activo' },
                };
              }
            }

            const clienteFinal =
              nuevoClienteId || reserva.cliente?._id || reserva.cliente;
            const duplicada = await conSesion(
              Reserva.findOne({
                bloque: bloqueDestino._id || bloqueDestinoId,
                fecha: fechaDestino,
                cliente: clienteFinal,
                estado: { $in: ['pendiente', 'confirmada'] },
                _id: { $ne: reserva._id },
              }),
              session
            );
            if (duplicada) {
              return {
                status: 409,
                body: {
                  mensaje: 'El cliente ya posee una reserva activa en el bloque y fecha de destino',
                },
              };
            }

            const estadoAnterior = reserva.estado;
            const bloqueAnterior = bloqueAnteriorId;
            const fechaAnterior = reserva.fecha;

            reserva.bloque = bloqueDestino._id || bloqueDestinoId;
            reserva.recinto = recintoId || reserva.recinto;
            reserva.clase = bloqueDestino.clase?._id || bloqueDestino.clase || reserva.clase;
            reserva.fecha = fechaDestino;
            if (nuevoClienteId) reserva.cliente = nuevoClienteId;
            reserva.gestionadoPor = req.user.id;

            if (Array.isArray(reserva.historialCambios)) {
              reserva.historialCambios.push({
                usuario: req.user.id,
                rol: req.user.rol,
                fecha: new Date(),
                resumen: `De bloque ${bloqueAnterior} / ${fechaAnterior} (${estadoAnterior}) a bloque ${bloqueDestinoId} / ${fechaDestino}`,
              });
            }

            if (typeof reserva.save === 'function') {
              await reserva.save(opcionesSesion(session));
            }

            await sincronizarContadorBloque(bloqueAnteriorId, session);
            if (String(bloqueDestinoId) !== String(bloqueAnteriorId)) {
              await sincronizarContadorBloque(bloqueDestinoId, session);
            }

            return { status: 200, body: reserva };
          } catch (err) {
            console.error('Error al reasignar la reserva:', err.message, err.code);
            if (err.code === 11000) {
              return {
                status: 409,
                body: {
                  mensaje: 'El cliente ya posee una reserva activa en el bloque y fecha de destino',
                },
              };
            }
            return { status: 500, body: { mensaje: 'Error al reasignar la reserva' } };
          }
        })
      );
    } catch (err) {
      console.error('Error al reasignar la reserva:', err.message, err.code);
      return res.status(500).json({ mensaje: 'Error al reasignar la reserva' });
    }

    return res.status(resultado.status).json(resultado.body);
  } catch (err) {
    return res.status(500).json({ mensaje: 'Error al reasignar la reserva' });
  }
}

// ============================================================================
// GET /api/reservas/conteo-instructor (ST03.09 · Instructor / Coordinador / Admin)
// ============================================================================
async function conteoReservasPorInstructor(req, res) {
  try {
    const { fecha } = req.query || {};
    if (fecha && !esFechaCalendarioValida(fecha)) {
      return res.status(400).json({ mensaje: 'El formato de fecha debe ser YYYY-MM-DD' });
    }
    if (fecha && !esFechaFutura(fecha)) {
      return res.status(400).json({ mensaje: 'La fecha debe ser futura o el día de hoy' });
    }

    const filtroBloques = {};

    if (req.user.rol === 'instructor') {
      filtroBloques.instructor = req.user.id;
    } else if (req.query?.instructor) {
      filtroBloques.instructor = req.query.instructor;
    }

    const consulta = BloqueDisponibilidad.find(filtroBloques);
    const bloques =
      consulta && typeof consulta.populate === 'function'
        ? await consulta
            .populate('clase', 'nombre tipoRutina')
            .populate('recinto', 'nombre tipo capacidad')
            .populate('instructor', 'correo rol')
        : await consulta;

    const resumen = [];

    for (const b of bloques || []) {
      const filtroBase = { bloque: b._id };
      if (fecha && FECHA_REGEX.test(fecha)) {
        filtroBase.fecha = fecha;
      }

      const [pendientes, confirmadas, canceladas] = await Promise.all([
        Reserva.countDocuments({ ...filtroBase, estado: 'pendiente' }),
        Reserva.countDocuments({ ...filtroBase, estado: 'confirmada' }),
        Reserva.countDocuments({ ...filtroBase, estado: 'cancelada' }),
      ]);

      const totalReservadas = Number(pendientes || 0) + Number(confirmadas || 0);
      const capacidad = Number(b.capacidad || 0);
      const cuposLibres = Math.max(0, capacidad - totalReservadas);

      resumen.push({
        bloqueId: b._id,
        diaSemana: b.diaSemana,
        horaInicio: b.horaInicio,
        horaFin: b.horaFin,
        capacidad,
        clase: b.clase,
        recinto: b.recinto,
        instructor: b.instructor,
        fechaFiltro: fecha || null,
        totalReservadas,
        pendientes: Number(pendientes || 0),
        confirmadas: Number(confirmadas || 0),
        canceladas: Number(canceladas || 0),
        cuposLibres,
      });
    }

    return res.json(resumen);
  } catch (err) {
    return res
      .status(500)
      .json({ mensaje: 'Error al consultar el conteo de reservas por clase y horario' });
  }
}

module.exports = {
  consultarDisponibilidad,
  crearReserva,
  listarMisReservas,
  confirmarAsistenciaCliente,
  cancelarReservaPropia,
  listarReservas,
  confirmarReservaCoordinador,
  cancelarReservaCoordinador,
  reasignarReservaAdmin,
  conteoReservasPorInstructor,
};
