const User = require('../models/User');
const { ROLES } = require('../config/permisos');

async function listarUsuarios(req, res) {
  try {
    const filtro = {};
    if (req.query?.rol && ROLES.includes(req.query.rol)) {
      filtro.rol = req.query.rol;
    }
    const usuarios = await User.find(filtro).sort({ createdAt: -1 });
    return res.json(usuarios);
  } catch (err) {
    return res.status(500).json({ mensaje: 'Error al consultar los usuarios' });
  }
}

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

module.exports = { listarUsuarios, crearUsuario };
