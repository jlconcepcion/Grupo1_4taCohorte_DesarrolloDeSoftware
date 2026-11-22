const User = require('../models/User');
const { firmarToken } = require('../config/jwt');
const {
  enviarBienvenida,
  registrarNotificacionNavegacion,
} = require('../services/notificaciones.service');

const CORREO_REGEX = /^\S+@\S+\.\S+$/;
const TELEFONO_REGEX = /^\+?[1-9]\d{1,14}$/;

function validarRegistro({ correo, password, telefono }) {
  const errores = [];
  if (!correo || !CORREO_REGEX.test(correo)) errores.push('Correo inválido');
  if (!password || password.length < 8) {
    errores.push('La contraseña debe tener al menos 8 caracteres');
  }
  if (telefono && !TELEFONO_REGEX.test(telefono)) {
    errores.push('El teléfono debe estar en formato E.164');
  }
  return errores;
}

// ST01.03: registro público de clientes.
async function registro(req, res) {
  const { correo, password, telefono = '' } = req.body || {};
  const telefonoNormalizado = String(telefono).trim();
  const errores = validarRegistro({ correo, password, telefono: telefonoNormalizado });
  if (errores.length) {
    return res.status(400).json({ mensaje: 'Datos inválidos', errores });
  }

  try {
    const usuario = await User.create({
      correo,
      password,
      rol: 'cliente',
      telefono: telefonoNormalizado,
    });

    registrarNotificacionNavegacion({
      destinatario: usuario?._id,
      asunto: 'Bienvenido',
      mensaje: 'Tu cuenta de cliente quedó creada correctamente.',
    }).catch(() => {});

    enviarBienvenida(usuario).catch(() => {});

    return res.status(201).json({ usuario, token: firmarToken(usuario) });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ mensaje: 'El correo ya está registrado' });
    }
    return res.status(500).json({ mensaje: 'Error al registrar el usuario' });
  }
}

// ST01.04: inicio de sesión con token de caducidad.
async function login(req, res) {
  const { correo, password } = req.body || {};
  if (!correo || !password) {
    return res.status(400).json({ mensaje: 'Correo y contraseña son obligatorios' });
  }

  try {
    const usuario = await User.findOne({ correo: correo.toLowerCase().trim() });
    const credencialesValidas =
      usuario && usuario.activo && (await usuario.compararPassword(password));

    if (!credencialesValidas) {
      return res.status(401).json({ mensaje: 'Credenciales incorrectas' });
    }

    return res.json({ usuario, token: firmarToken(usuario) });
  } catch (err) {
    return res.status(500).json({ mensaje: 'Error al iniciar sesión' });
  }
}

async function perfil(req, res) {
  try {
    const usuario = await User.findById(req.user.id);
    if (!usuario || !usuario.activo) {
      return res.status(401).json({ mensaje: 'Sesión inválida' });
    }
    return res.json(usuario);
  } catch (err) {
    return res.status(401).json({ mensaje: 'Sesión inválida' });
  }
}

module.exports = { registro, login, perfil };
