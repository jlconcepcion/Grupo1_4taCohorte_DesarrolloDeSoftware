const Reserva = require('../models/Reserva');
const { enviarRecordatorio, fechaHoraInicio } = require('../services/notificaciones.service');

function zonaHoraria() {
  return process.env.TZ || 'America/Bogota';
}

function fechaLocal(fecha = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: zonaHoraria(),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(fecha);
}

function sumarUnDia(fechaIso) {
  const [anio, mes, dia] = fechaIso.split('-').map(Number);
  const valor = new Date(Date.UTC(anio, mes - 1, dia));
  valor.setUTCDate(valor.getUTCDate() + 1);
  return valor.toISOString().slice(0, 10);
}

async function ejecutarRecordatorios() {
  const hoy = fechaLocal();
  const manana = sumarUnDia(hoy);
  const consulta = Reserva.find({
    estado: { $in: ['pendiente', 'confirmada'] },
    fecha: { $in: [hoy, manana] },
    $or: [{ recordatorioEnviado: { $ne: true } }, { tokenConfirmacion: null }],
  }).populate([
    { path: 'cliente' },
    { path: 'recinto' },
    { path: 'clase' },
    { path: 'bloque' },
  ]);

  const reservas = await consulta;
  const ahora = Date.now();
  const ventanaMinutos = Number(process.env.NOTIFICACIONES_VENTANA_MIN || 60);
  const toleranciaMinutos = Number(process.env.NOTIFICACIONES_TOLERANCIA_MIN || 5);
  const objetivoMs = ventanaMinutos * 60 * 1000;
  const toleranciaMs = toleranciaMinutos * 60 * 1000;

  const candidatas = (Array.isArray(reservas) ? reservas : []).filter((reserva) => {
    const inicio = fechaHoraInicio(reserva);
    if (!inicio) return false;
    const diferencia = inicio.getTime() - ahora;
    return diferencia >= 0 && Math.abs(diferencia - objetivoMs) <= toleranciaMs;
  });

  const resultados = [];
  for (const reserva of candidatas) {
    const resultado = await enviarRecordatorio(reserva);
    resultados.push({ reserva: reserva._id, ...resultado });
  }
  return resultados;
}

function iniciarRecordatorios() {
  const intervalo = Number(process.env.NOTIFICACIONES_INTERVAL_MS || 60000);
  const temporizador = setInterval(() => {
    ejecutarRecordatorios().catch((err) => {
      console.error('Error al enviar recordatorios:', err.message);
    });
  }, intervalo);

  if (typeof temporizador.unref === 'function') temporizador.unref();
  ejecutarRecordatorios().catch((err) => {
    console.error('Error al enviar recordatorios:', err.message);
  });

  return temporizador;
}

module.exports = { ejecutarRecordatorios, iniciarRecordatorios, fechaLocal };
