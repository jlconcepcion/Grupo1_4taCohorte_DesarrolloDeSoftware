const User = require('../models/User');
const { ROLES } = require('../config/permisos');
const {
  preferenciasRecordatorioPorDefecto,
  validarPreferenciasRecordatorio,
} = require('../config/notificaciones');
const {
  enviarBienvenida,
  registrarNotificacionNavegacion,
} = require('../services/notificaciones.service');

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
  const { correo, password, rol, telefono = '', preferenciasRecordatorio } = req.body || {};
  const telefonoNormalizado = String(telefono).trim();

  const errores = [];
  if (!correo || !/^\S+@\S+\.\S+$/.test(correo)) errores.push('Correo inválido');
  if (!password || password.length < 8) errores.push('La contraseña debe tener al menos 8 caracteres');
  if (!ROLES.includes(rol)) errores.push(`Rol inválido. Opciones: ${ROLES.join(', ')}`);
  if (telefonoNormalizado && !/^\+?[1-9]\d{1,14}$/.test(telefonoNormalizado)) {
    errores.push('El teléfono debe estar en formato E.164');
  }
  const validacion = validarPreferenciasRecordatorio(
    preferenciasRecordatorio ?? preferenciasRecordatorioPorDefecto()
  );
  errores.push(...validacion.errores);
  if (errores.length) {
    return res.status(400).json({ mensaje: 'Datos inválidos', errores });
  }

  try {
    const usuario = await User.create({
      correo,
      password,
      rol,
      telefono: telefonoNormalizado,
      preferenciasRecordatorio: validacion.preferencias,
    });

    registrarNotificacionNavegacion({
      destinatario: usuario?._id,
      asunto: 'Cuenta creada',
      mensaje: `Tu cuenta ${usuario?.correo || correo} quedó creada con rol ${rol}.`,
    }).catch(() => {});
    if (String(req.user?.id || '') !== String(usuario?._id || '')) {
      registrarNotificacionNavegacion({
        destinatario: req.user?.id,
        asunto: 'Usuario creado',
        mensaje: `Se creó la cuenta ${usuario?.correo || correo} con rol ${rol}.`,
      }).catch(() => {});
    }

    enviarBienvenida(usuario).catch(() => {});

    return res.status(201).json(usuario);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ mensaje: 'El correo ya está registrado' });
    }
    return res.status(500).json({ mensaje: 'Error al crear el usuario' });
  }
}

module.exports = { listarUsuarios, crearUsuario };
