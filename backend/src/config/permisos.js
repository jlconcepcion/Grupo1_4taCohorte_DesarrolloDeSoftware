const ROLES = ['cliente', 'coordinador', 'instructor', 'administrador'];

// Matriz de permisos: acción -> roles autorizados
const PERMISOS = {
  // Usuarios
  'usuarios:crear': ['administrador'],

  // Recintos
  'recintos:ver': ['cliente', 'coordinador', 'instructor', 'administrador'],
  'recintos:gestionar': ['administrador'],

  // Clases y horarios
  'clases:propias': ['instructor'],
  'horarios:propios': ['instructor'],
  'horarios:gestionar': ['coordinador', 'administrador'],

  // Reservas
  'reservas:crear': ['cliente'],
  'reservas:cancelar-propia': ['cliente'],
  'reservas:gestionar': ['coordinador', 'administrador'],
  'reservas:reasignar': ['administrador'],
  'reservas:conteo': ['instructor', 'coordinador', 'administrador'],

  // Sugerencias, reportes e indicadores
  'sugerencias:crear': ['cliente'],
  'sugerencias:ver': ['coordinador', 'administrador'],
  'reportes:ver': ['coordinador', 'administrador'],
  'indicadores:ver': ['administrador'],
};

module.exports = { PERMISOS, ROLES };
