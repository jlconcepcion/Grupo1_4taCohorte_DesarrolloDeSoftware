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

const TELEFONO_REGEX = /^\+?[1-9]\d{1,14}$/;
const NOMBRE_USUARIO_MAX = 40;

function validarDatosPerfil(nombreUsuario, telefono) {
  const errores = [];
  if (nombreUsuario && nombreUsuario.length > NOMBRE_USUARIO_MAX) {
    errores.push('El nombre de usuario no puede superar los 40 caracteres');
  }
  if (telefono && !TELEFONO_REGEX.test(telefono)) {
    errores.push('El teléfono debe estar en formato E.164');
  }
  return errores;
}

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
  const {
    correo,
    password,
    rol,
    telefono = '',
    nombreUsuario = '',
    preferenciasRecordatorio,
  } = req.body || {};
  const telefonoNormalizado = String(telefono).trim();
  const nombreUsuarioNormalizado = String(nombreUsuario).trim();

  const errores = [];
  if (!correo || !/^\S+@\S+\.\S+$/.test(correo)) errores.push('Correo inválido');
  if (!password || password.length < 8) errores.push('La contraseña debe tener al menos 8 caracteres');
  if (!ROLES.includes(rol)) errores.push(`Rol inválido. Opciones: ${ROLES.join(', ')}`);
  errores.push(...validarDatosPerfil(nombreUsuarioNormalizado, telefonoNormalizado));
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
      nombreUsuario: nombreUsuarioNormalizado,
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

async function actualizarPerfilUsuario(req, res) {
  const id = req.params?.id;
  const esPropio = String(req.user?.id || '') === String(id);
  const esAdmin = req.user?.rol === 'administrador';
  if (!esPropio && !esAdmin) {
    return res.status(403).json({ mensaje: 'No puedes editar este usuario' });
  }

  const cuerpo = req.body || {};
  const camposPermitidos = ['nombreUsuario', 'telefono'];
  if (Object.keys(cuerpo).some((campo) => !camposPermitidos.includes(campo))) {
    return res
      .status(400)
      .json({ mensaje: 'Solo se pueden actualizar nombreUsuario y telefono' });
  }

  try {
    const usuario = await User.findById(id);
    if (!usuario || !usuario.activo) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    const nombreUsuario =
      cuerpo.nombreUsuario === undefined
        ? String(usuario.nombreUsuario || '').trim()
        : String(cuerpo.nombreUsuario ?? '').trim();
    const telefono =
      cuerpo.telefono === undefined
        ? String(usuario.telefono || '').trim()
        : String(cuerpo.telefono ?? '').trim();

    const errores = validarDatosPerfil(nombreUsuario, telefono);
    if (errores.length) {
      return res.status(400).json({ mensaje: 'Datos inválidos', errores });
    }

    usuario.nombreUsuario = nombreUsuario;
    usuario.telefono = telefono;
    await usuario.save();

    return res.json(usuario);
  } catch (err) {
    return res.status(500).json({ mensaje: 'Error al actualizar el usuario' });
  }
}

module.exports = { listarUsuarios, crearUsuario, actualizarPerfilUsuario };
