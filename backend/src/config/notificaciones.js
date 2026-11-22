const CANALES_RECORDATORIO = ['email', 'whatsapp', 'navegacion'];

function preferenciasRecordatorioPorDefecto() {
  return {
    activo: true,
    canales: [...CANALES_RECORDATORIO],
    minutosAnticipacion: null,
  };
}

function normalizarPreferenciasRecordatorio(valor) {
  const actual = valor && typeof valor === 'object' ? valor : {};
  const canales = Array.isArray(actual.canales)
    ? [...new Set(actual.canales.map((canal) => String(canal).trim()))]
    : [...CANALES_RECORDATORIO];
  const minutos = actual.minutosAnticipacion;

  return {
    activo: actual.activo === undefined ? true : Boolean(actual.activo),
    canales,
    minutosAnticipacion:
      minutos === null || minutos === undefined || minutos === ''
        ? null
        : Number(minutos),
  };
}

function validarPreferenciasRecordatorio(valor) {
  const preferencias = normalizarPreferenciasRecordatorio(valor);
  const errores = [];

  if (typeof preferencias.activo !== 'boolean') {
    errores.push('activo debe ser booleano');
  }
  if (!preferencias.canales.length) {
    errores.push('Selecciona al menos un canal');
  }
  if (preferencias.canales.some((canal) => !CANALES_RECORDATORIO.includes(canal))) {
    errores.push(`Canales válidos: ${CANALES_RECORDATORIO.join(', ')}`);
  }
  if (
    preferencias.minutosAnticipacion !== null &&
    (!Number.isFinite(preferencias.minutosAnticipacion) ||
      preferencias.minutosAnticipacion < 5 ||
      preferencias.minutosAnticipacion > 1440)
  ) {
    errores.push('minutosAnticipacion debe estar entre 5 y 1440 o ser null');
  }

  return { errores, preferencias };
}

module.exports = {
  CANALES_RECORDATORIO,
  preferenciasRecordatorioPorDefecto,
  normalizarPreferenciasRecordatorio,
  validarPreferenciasRecordatorio,
};
