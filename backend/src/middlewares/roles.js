const { PERMISOS } = require('../config/permisos');

// Protege una ruta según una acción de la matriz.
// Uso: router.post('/', requirePermiso('usuarios:crear'), controlador)
function requirePermiso(permiso) {
  if (!PERMISOS[permiso]) {
    throw new Error(`Permiso desconocido: ${permiso}`);
  }
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ mensaje: 'No autenticado' });
    }
    if (!PERMISOS[permiso].includes(req.user.rol)) {
      return res.status(403).json({ mensaje: 'No tienes permiso para esta acción' });
    }
    next();
  };
}

module.exports = { requirePermiso };
