const User = require('../models/User');
const { ROLES } = require('../config/permisos');

async function crearUsuario(req, res) {
  const { correo, password, rol } = req.body || {};

  const errores = [];
  if (!correo || !/^\S+@\S+\.\S+$/.test(correo)) errores.push('Correo inválido');
  if (!password || password.length < 8) errores.push('La contraseña debe tener al menos 8 caracteres');
  if (!ROLES.includes(rol)) errores.push(`Rol inválido. Opciones: ${ROLES.join(', ')}`);
  if (errores.length) {
    return res.status(400).json({ mensaje: 'Datos inválidos', errores });
  }

  try {
    const usuario = await User.create({ correo, password, rol });
    return res.status(201).json(usuario);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ mensaje: 'El correo ya está registrado' });
    }
    return res.status(500).json({ mensaje: 'Error al crear el usuario' });
  }
}

module.exports = { crearUsuario };