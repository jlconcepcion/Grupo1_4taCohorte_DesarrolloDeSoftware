const BloqueDisponibilidad = require('../models/BloqueDisponibilidad');
const Clase = require('../models/Clase');
const Recinto = require('../models/Recinto');
const Reserva = require('../models/Reserva');
const { PERMISOS } = require('../config/permisos');

const HORA_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

const MAPA_DIAS = {
  domingo: 0,
  lunes: 1,
  martes: 2,
  miercoles: 3,
  miércoles: 3,
  jueves: 4,
  viernes: 5,
  sabado: 6,
  sábado: 6,
};

function normalizarDiaSemana(valor) {
  if (typeof valor === 'number' && Number.isInteger(valor) && valor >= 0 && valor <= 6) {
    return valor;
  }
  if (typeof valor === 'string' && valor.trim() !== '') {
    const limpio = valor.trim().toLowerCase();
    if (/^[0-6]$/.test(limpio)) return Number(limpio);
    if (limpio in MAPA_DIAS) return MAPA_DIAS[limpio];
  }
  return null;
}

function aMinutos(hora) {
  if (typeof hora !== 'string') return null;
  const match = hora.trim().match(HORA_REGEX);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function seSolapan(inicioA, finA, inicioB, finB) {
  return inicioA < finB && finA > inicioB;
}

function tieneAlgunPermiso(rol, listaPermisos) {
  return listaPermisos.some((p) => PERMISOS[p]?.includes(rol));
}

async function obtenerConteoReservasActivas(bloqueDoc) {
  if (Reserva && typeof Reserva.countDocuments === 'function') {
    const enColeccion = await Reserva.countDocuments({
      bloque: bloqueDoc._id,
      estado: { $in: ['pendiente', 'confirmada'] },
    });
    return Number(enColeccion || 0);
  }
  return Number(bloqueDoc.reservasActivas || 0);
}

// GET /api/bloques (HU07, HU09, ST02.09, ST02.10)
async function listarBloques(req, res) {
  try {
    const filtro = {};
    if (req.query?.propios === 'true' && req.user?.id) {
      filtro.instructor = req.user.id;
    } else if (req.query?.instructor) {
      filtro.instructor = req.query.instructor;
    }

    if (req.query?.recinto) {
      filtro.recinto = req.query.recinto;
    }
    if (req.query?.clase) {
      filtro.clase = req.query.clase;
    }
    if (req.query?.diaSemana !== undefined && req.query.diaSemana !== '') {
      const dia = normalizarDiaSemana(req.query.diaSemana);
      if (dia !== null) filtro.diaSemana = dia;
    }

    const consulta = BloqueDisponibilidad.find(filtro);
    const bloques =
      consulta && typeof consulta.populate === 'function'
        ? await consulta
            .populate('clase', 'nombre tipoRutina activa')
            .populate('instructor', 'correo nombreUsuario rol')
            .populate('recinto', 'nombre tipo capacidad activo')
            .populate('modificadoPor', 'correo nombreUsuario rol')
        : await consulta;

    if (req.user?.rol === 'cliente' && Array.isArray(bloques)) {
      return res.json(
        bloques.filter((b) => !b.recinto || b.recinto.activo !== false)
      );
    }

    return res.json(bloques);
  } catch (err) {
    return res.status(500).json({ mensaje: 'Error al consultar los bloques de horario' });
  }
}

// POST /api/bloques (HU07, ST02.05, ST02.06)
async function crearBloque(req, res) {
  if (!req.user) {
    return res.status(401).json({ mensaje: 'No autenticado' });
  }

  // HU07: El instructor registra bloques propios (solo rol con permiso horarios:propios)
  if (!tieneAlgunPermiso(req.user.rol, ['horarios:propios'])) {
    return res.status(403).json({ mensaje: 'No tienes permiso para registrar bloques propios' });
  }

  const { clase, recinto, diaSemana, horaInicio, horaFin, capacidad } = req.body || {};
  const errores = [];

  if (!clase) errores.push('La clase es obligatoria');
  if (!recinto) errores.push('El recinto es obligatorio');

  const diaNorm = normalizarDiaSemana(diaSemana);
  if (diaNorm === null) {
    errores.push('El día de la semana es inválido (debe ser entre 0 y 6 o lunes a domingo)');
  }

  const minInicio = aMinutos(horaInicio);
  const minFin = aMinutos(horaFin);
  if (minInicio === null) errores.push('La hora de inicio debe tener formato HH:MM (24h)');
  if (minFin === null) errores.push('La hora de fin debe tener formato HH:MM (24h)');
  if (minInicio !== null && minFin !== null && minFin <= minInicio) {
    errores.push('La hora de fin debe ser posterior a la hora de inicio');
  }

  const capNum = Number(capacidad);
  if (!Number.isInteger(capNum) || capNum <= 0) {
    errores.push('La capacidad debe ser un número entero mayor que cero');
  }

  if (errores.length) {
    return res.status(400).json({ mensaje: errores[0], errores });
  }

  try {
    const recintoDoc = await Recinto.findById(recinto);
    if (!recintoDoc) {
      return res.status(404).json({ mensaje: 'El recinto seleccionado no existe' });
    }
    if (!recintoDoc.activo) {
      return res
        .status(400)
        .json({ mensaje: 'No se puede registrar un bloque en un recinto inactivo' });
    }

    const capacidadRecinto = Number(recintoDoc.capacidad);
    if (Number.isFinite(capacidadRecinto) && capNum > capacidadRecinto) {
      return res.status(400).json({
        mensaje: `La capacidad del bloque (${capNum}) no puede superar la capacidad del recinto (${capacidadRecinto})`,
      });
    }

    const claseDoc = await Clase.findById(clase);
    if (!claseDoc) {
      return res.status(404).json({ mensaje: 'La clase seleccionada no existe' });
    }

    const claseInstructorId = claseDoc.instructor?._id || claseDoc.instructor;
    if (String(claseInstructorId) !== String(req.user.id)) {
      return res
        .status(403)
        .json({ mensaje: 'Solo puedes registrar bloques para tus propias clases' });
    }

    // ST02.06 / HU07: Validar que no se solape con otro bloque del mismo instructor el mismo día
    const bloquesExistentes = await BloqueDisponibilidad.find({
      instructor: req.user.id,
      diaSemana: diaNorm,
    });

    for (const existente of bloquesExistentes || []) {
      const exInicio = aMinutos(existente.horaInicio);
      const exFin = aMinutos(existente.horaFin);
      if (exInicio !== null && exFin !== null && seSolapan(minInicio, minFin, exInicio, exFin)) {
        return res.status(409).json({
          mensaje: `El horario ${horaInicio}–${horaFin} se solapa con otro bloque existente (${existente.horaInicio}–${existente.horaFin}) del mismo día`,
        });
      }
    }

    const nuevoBloque = await BloqueDisponibilidad.create({
      clase: claseDoc._id || clase,
      instructor: req.user.id,
      recinto: recintoDoc._id || recinto,
      diaSemana: diaNorm,
      horaInicio: horaInicio.trim(),
      horaFin: horaFin.trim(),
      capacidad: capNum,
      reservasActivas: 0,
      modificadoPor: req.user.id,
      fechaModificacion: new Date(),
    });

    return res.status(201).json(nuevoBloque);
  } catch (err) {
    return res.status(500).json({ mensaje: 'Error al registrar el bloque de disponibilidad' });
  }
}

// PUT / PATCH /api/bloques/:id (HU08 para instructor propio; HU09 / ST02.09 para coordinador y admin)
async function actualizarBloque(req, res) {
  if (!req.user) {
    return res.status(401).json({ mensaje: 'No autenticado' });
  }

  const puedePropios = tieneAlgunPermiso(req.user.rol, ['horarios:propios']);
  const puedeGestionarTodos = tieneAlgunPermiso(req.user.rol, ['horarios:gestionar']);

  if (!puedePropios && !puedeGestionarTodos) {
    return res.status(403).json({ mensaje: 'No tienes permiso para modificar horarios' });
  }

  const { id } = req.params;
  const { diaSemana, horaInicio, horaFin, capacidad, recinto } = req.body || {};

  try {
    const bloque = await BloqueDisponibilidad.findById(id);
    if (!bloque) {
      return res.status(404).json({ mensaje: 'Bloque de horario no encontrado' });
    }

    const instructorBloqueId = bloque.instructor?._id || bloque.instructor;
    if (!puedeGestionarTodos && String(instructorBloqueId) !== String(req.user.id)) {
      return res.status(403).json({ mensaje: 'Solo puedes modificar tus propios bloques de horario' });
    }

    const nuevoDia =
      diaSemana !== undefined ? normalizarDiaSemana(diaSemana) : bloque.diaSemana;
    if (nuevoDia === null) {
      return res.status(400).json({ mensaje: 'El día de la semana es inválido' });
    }

    const nuevaHoraInicio =
      horaInicio !== undefined ? String(horaInicio).trim() : bloque.horaInicio;
    const nuevaHoraFin =
      horaFin !== undefined ? String(horaFin).trim() : bloque.horaFin;

    const minInicio = aMinutos(nuevaHoraInicio);
    const minFin = aMinutos(nuevaHoraFin);
    if (minInicio === null || minFin === null) {
      return res.status(400).json({ mensaje: 'El formato de hora debe ser HH:MM (24h)' });
    }
    if (minFin <= minInicio) {
      return res
        .status(400)
        .json({ mensaje: 'La hora de fin debe ser posterior a la hora de inicio' });
    }

    const nuevaCapacidad =
      capacidad !== undefined ? Number(capacidad) : Number(bloque.capacidad);
    if (!Number.isInteger(nuevaCapacidad) || nuevaCapacidad <= 0) {
      return res
        .status(400)
        .json({ mensaje: 'La capacidad debe ser un número entero mayor que cero' });
    }

    // HU08 y HU09: Validar que la capacidad no baje de las reservas activas
    const reservasActivas = await obtenerConteoReservasActivas(bloque);
    if (nuevaCapacidad < reservasActivas) {
      return res.status(409).json({
        mensaje: `La capacidad (${nuevaCapacidad}) no puede quedar por debajo de las reservas activas (${reservasActivas})`,
      });
    }

    const recintoId = recinto !== undefined ? recinto : bloque.recinto?._id || bloque.recinto;
    if (recinto !== undefined || capacidad !== undefined) {
      const recintoDoc = await Recinto.findById(recintoId);
      if (!recintoDoc) {
        return res.status(404).json({ mensaje: 'El recinto seleccionado no existe' });
      }
      if (!recintoDoc.activo) {
        return res
          .status(400)
          .json({ mensaje: 'No se puede asignar el bloque a un recinto inactivo' });
      }

      const capacidadRecinto = Number(recintoDoc.capacidad);
      if (Number.isFinite(capacidadRecinto) && nuevaCapacidad > capacidadRecinto) {
        return res.status(400).json({
          mensaje: `La capacidad del bloque (${nuevaCapacidad}) no puede superar la capacidad del recinto (${capacidadRecinto})`,
        });
      }

      if (recinto !== undefined) {
        bloque.recinto = recintoDoc._id || recinto;
      }
    }

    // Validar que el cambio no provoque solapamiento con otros bloques del mismo instructor ese día
    const otrosBloques = await BloqueDisponibilidad.find({
      instructor: instructorBloqueId,
      diaSemana: nuevoDia,
    });

    for (const otro of otrosBloques || []) {
      if (String(otro._id) === String(bloque._id)) continue;
      const oInicio = aMinutos(otro.horaInicio);
      const oFin = aMinutos(otro.horaFin);
      if (oInicio !== null && oFin !== null && seSolapan(minInicio, minFin, oInicio, oFin)) {
        return res.status(409).json({
          mensaje: `El horario ${nuevaHoraInicio}–${nuevaHoraFin} se solapa con otro bloque del instructor (${otro.horaInicio}–${otro.horaFin})`,
        });
      }
    }

    const ahora = new Date();
    const resumenCambio = `Actualizado a día ${nuevoDia}, ${nuevaHoraInicio}-${nuevaHoraFin}, cap ${nuevaCapacidad}`;

    bloque.diaSemana = nuevoDia;
    bloque.horaInicio = nuevaHoraInicio;
    bloque.horaFin = nuevaHoraFin;
    bloque.capacidad = nuevaCapacidad;
    bloque.modificadoPor = req.user.id;
    bloque.fechaModificacion = ahora;

    if (Array.isArray(bloque.historialCambios)) {
      bloque.historialCambios.push({
        usuario: req.user.id,
        rol: req.user.rol,
        fecha: ahora,
        resumen: resumenCambio,
      });
    }

    await bloque.save();
    return res.json(bloque);
  } catch (err) {
    return res.status(500).json({ mensaje: 'Error al actualizar el bloque de disponibilidad' });
  }
}

// DELETE /api/bloques/:id (ST02.07, HU09)
async function eliminarBloque(req, res) {
  if (!req.user) {
    return res.status(401).json({ mensaje: 'No autenticado' });
  }

  const puedePropios = tieneAlgunPermiso(req.user.rol, ['horarios:propios']);
  const puedeGestionarTodos = tieneAlgunPermiso(req.user.rol, ['horarios:gestionar']);

  if (!puedePropios && !puedeGestionarTodos) {
    return res.status(403).json({ mensaje: 'No tienes permiso para eliminar bloques de horario' });
  }

  const { id } = req.params;

  try {
    const bloque = await BloqueDisponibilidad.findById(id);
    if (!bloque) {
      return res.status(404).json({ mensaje: 'Bloque de horario no encontrado' });
    }

    const instructorBloqueId = bloque.instructor?._id || bloque.instructor;
    if (!puedeGestionarTodos && String(instructorBloqueId) !== String(req.user.id)) {
      return res.status(403).json({ mensaje: 'Solo puedes eliminar tus propios bloques de horario' });
    }

    // ST02.07 / HU09: No permitir eliminar bloques con reservas activas
    const reservasActivas = await obtenerConteoReservasActivas(bloque);
    if (reservasActivas > 0) {
      return res.status(409).json({
        mensaje: 'No se puede eliminar un bloque con reservas activas',
      });
    }

    if (typeof bloque.deleteOne === 'function') {
      await bloque.deleteOne();
    } else {
      await BloqueDisponibilidad.findByIdAndDelete(id);
    }

    return res.json({ mensaje: 'Bloque de disponibilidad eliminado correctamente' });
  } catch (err) {
    return res.status(500).json({ mensaje: 'Error al eliminar el bloque de disponibilidad' });
  }
}

module.exports = {
  listarBloques,
  crearBloque,
  actualizarBloque,
  eliminarBloque,
};

