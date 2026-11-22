const Reserva = require('../models/Reserva');

const ESTADOS_RESERVA = ['pendiente', 'confirmada', 'cancelada'];
const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function esFechaValida(fecha) {
  if (!FECHA_REGEX.test(fecha)) return false;
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const valor = new Date(anio, mes - 1, dia);
  return (
    valor.getFullYear() === anio &&
    valor.getMonth() === mes - 1 &&
    valor.getDate() === dia
  );
}

function esFechaFutura(fecha) {
  const hoy = new Date();
  const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const [anio, mes, dia] = fecha.split('-').map(Number);
  return new Date(anio, mes - 1, dia) >= inicioHoy;
}

function celda(valor) {
  return `"${String(valor ?? '').replaceAll('"', '""')}"`;
}

async function poblar(consulta) {
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

async function descargarReservasCsv(req, res) {
  try {
    const { fecha, recinto, clase, instructor, estado } = req.query || {};

    if (fecha && !esFechaValida(fecha)) {
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

    let reservas = await poblar(Reserva.find(filtro));
    reservas = Array.isArray(reservas) ? reservas : [];

    if (instructor) {
      reservas = reservas.filter((reserva) => {
        const instructorBloque = reserva.bloque?.instructor?._id || reserva.bloque?.instructor;
        const instructorClase = reserva.clase?.instructor?._id || reserva.clase?.instructor;
        return (
          String(instructorBloque || '') === String(instructor) ||
          String(instructorClase || '') === String(instructor)
        );
      });
    }

    reservas.sort((a, b) => {
      const comparacionFecha = String(a.fecha || '').localeCompare(String(b.fecha || ''));
      if (comparacionFecha !== 0) return comparacionFecha;
      return String(a.bloque?.horaInicio || '').localeCompare(
        String(b.bloque?.horaInicio || '')
      );
    });

    const filas = [
      [
        'fecha',
        'horaInicio',
        'horaFin',
        'clase',
        'instructor',
        'recinto',
        'cliente',
        'correo',
        'estado',
        'fechaConfirmacion',
      ]
        .map(celda)
        .join(','),
    ];

    for (const reserva of reservas) {
      filas.push(
        [
          reserva.fecha,
          reserva.bloque?.horaInicio,
          reserva.bloque?.horaFin,
          reserva.clase?.nombre,
          reserva.bloque?.instructor?.correo || reserva.clase?.instructor?.correo,
          reserva.recinto?.nombre,
          reserva.cliente?.correo,
          reserva.cliente?.correo,
          reserva.estado,
          reserva.fechaConfirmacion
            ? new Date(reserva.fechaConfirmacion).toISOString()
            : '',
        ]
          .map(celda)
          .join(',')
      );
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="reservas.csv"');
    return res.send(`\uFEFF${filas.join('\r\n')}`);
  } catch (err) {
    return res.status(500).json({ mensaje: 'Error al generar el reporte CSV' });
  }
}

module.exports = { descargarReservasCsv };
