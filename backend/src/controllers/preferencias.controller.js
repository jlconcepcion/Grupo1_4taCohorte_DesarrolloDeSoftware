const User = require('../models/User');
const {
  normalizarPreferenciasRecordatorio,
  validarPreferenciasRecordatorio,
} = require('../config/notificaciones');

function respuestaPreferencias(usuario) {
  return {
    preferenciasRecordatorio: normalizarPreferenciasRecordatorio(
      usuario?.preferenciasRecordatorio
    ),
  };
}

async function obtenerMias(req, res) {
  try {
    const usuario = await User.findById(req.user.id);
    if (!usuario || usuario.activo === false) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }
    return res.json(respuestaPreferencias(usuario));
  } catch (err) {
    return res.status(500).json({ mensaje: 'Error al consultar las preferencias' });
  }
}

async function actualizarMias(req, res) {
  const { errores, preferencias } = validarPreferenciasRecordatorio(
    req.body?.preferenciasRecordatorio ?? req.body
  );
  if (errores.length) {
    return res.status(400).json({ mensaje: 'Preferencias inválidas', errores });
  }

  try {
    const usuario = await User.findById(req.user.id);
    if (!usuario || usuario.activo === false) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }
    usuario.preferenciasRecordatorio = preferencias;
    if (typeof usuario.save === 'function') await usuario.save();
    return res.json(respuestaPreferencias(usuario));
  } catch (err) {
    return res.status(500).json({ mensaje: 'Error al guardar las preferencias' });
  }
}

async function obtenerDeUsuario(req, res) {
  try {
    const usuario = await User.findById(req.params.id);
    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }
    return res.json(respuestaPreferencias(usuario));
  } catch (err) {
    return res.status(500).json({ mensaje: 'Error al consultar las preferencias' });
  }
}

async function actualizarDeUsuario(req, res) {
  const { errores, preferencias } = validarPreferenciasRecordatorio(
    req.body?.preferenciasRecordatorio ?? req.body
  );
  if (errores.length) {
    return res.status(400).json({ mensaje: 'Preferencias inválidas', errores });
  }

  try {
    const usuario = await User.findById(req.params.id);
    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }
    usuario.preferenciasRecordatorio = preferencias;
    if (typeof usuario.save === 'function') await usuario.save();
    return res.json(respuestaPreferencias(usuario));
  } catch (err) {
    return res.status(500).json({ mensaje: 'Error al guardar las preferencias' });
  }
}

module.exports = {
  obtenerMias,
  actualizarMias,
  obtenerDeUsuario,
  actualizarDeUsuario,
};
