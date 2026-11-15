const jwt = require('jsonwebtoken');

function firmarToken(usuario) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('Falta JWT_SECRET en el archivo .env');
  return jwt.sign(
    { id: String(usuario._id || usuario.id), rol: usuario.rol },
    secret,
    { expiresIn: process.env.JWT_EXPIRES_IN || '2h' }
  );
}

function verificarToken(token) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('Falta JWT_SECRET en el archivo .env');
  return jwt.verify(token, secret);
}

module.exports = { firmarToken, verificarToken };
