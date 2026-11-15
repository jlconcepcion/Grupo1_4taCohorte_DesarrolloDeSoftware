const { verificarToken } = require('../config/jwt');

// Lee el token Bearer del encabezado Authorization y deja el usuario en req.user.
function autenticar(req, res, next) {
  const header = req.headers.authorization || '';
  const [tipo, token] = header.split(' ');

  if (tipo !== 'Bearer' || !token) {
    return res.status(401).json({ mensaje: 'No autenticado' });
  }

  try {
    const payload = verificarToken(token);
    req.user = { id: payload.id, rol: payload.rol };
    return next();
  } catch (err) {
    return res.status(401).json({ mensaje: 'Sesión inválida o expirada' });
  }
}

module.exports = { autenticar };
