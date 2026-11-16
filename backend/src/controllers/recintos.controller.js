const Recinto = require('../models/Recinto');

function validarDatosRecinto({ nombre, tipo, capacidad }, parcial = false) {
  const errores = [];

  if (!parcial || nombre !== undefined) {
    if (!nombre || typeof nombre !== 'string' || !nombre.trim()) {
      errores.push('El nombre del recinto es obligatorio');
    }
  }

  if (!parcial || tipo !== undefined) {
    if (!tipo || typeof tipo !== 'string' || !tipo.trim()) {
      errores.push('El tipo de recinto es obligatorio');
    }
  }

  if (!parcial || capacidad !== undefined) {
    const capNum = Number(capacidad);
    if (!Number.isInteger(capNum) || capNum <= 0) {
      errores.push('La capacidad debe ser un número entero mayor que cero');
    }
  }

  return errores;
}

// GET /api/recintos (HU04, HU05, ST02.02)
// Los clientes solo ven recintos activos; admin/coordinador/instructor pueden ver todos o filtrar con ?soloActivos=true
async function listarRecintos(req, res) {
  try {
    const esCliente = req.user?.rol === 'cliente';
    const soloActivos = esCliente || req.query?.soloActivos === 'true';
    const filtro = soloActivos ? { activo: true } : {};

    const recintos = await Recinto.find(filtro).sort({ nombre: 1 });
    return res.json(recintos);
  } catch (err) {
    return res.status(500).json({ mensaje: 'Error al consultar los recintos' });
  }
}

// POST /api/recintos (HU04, ST02.02)
async function crearRecinto(req, res) {
  const { nombre, tipo, descripcion, capacidad } = req.body || {};
  const errores = validarDatosRecinto({ nombre, tipo, capacidad }, false);

  if (errores.length) {
    return res.status(400).json({ mensaje: 'Datos inválidos', errores });
  }

  try {
    const recinto = await Recinto.create({
      nombre: nombre.trim(),
      tipo: tipo.trim(),
      descripcion: typeof descripcion === 'string' ? descripcion.trim() : '',
      capacidad: Number(capacidad),
      activo: true,
    });
    return res.status(201).json(recinto);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ mensaje: 'Ya existe un recinto con ese nombre' });
    }
    return res.status(500).json({ mensaje: 'Error al crear el recinto' });
  }
}

// PUT / PATCH /api/recintos/:id (HU05, ST02.02)
async function actualizarRecinto(req, res) {
  const { id } = req.params;
  const { nombre, tipo, descripcion, capacidad, activo } = req.body || {};

  const errores = validarDatosRecinto({ nombre, tipo, capacidad }, true);
  if (activo !== undefined && typeof activo !== 'boolean') {
    errores.push('El estado activo debe ser booleano');
  }

  if (errores.length) {
    return res.status(400).json({ mensaje: 'Datos inválidos', errores });
  }

  try {
    const recinto = await Recinto.findById(id);
    if (!recinto) {
      return res.status(404).json({ mensaje: 'Recinto no encontrado' });
    }

    if (nombre !== undefined) recinto.nombre = nombre.trim();
    if (tipo !== undefined) recinto.tipo = tipo.trim();
    if (descripcion !== undefined) recinto.descripcion = String(descripcion).trim();
    if (capacidad !== undefined) recinto.capacidad = Number(capacidad);
    if (activo !== undefined) recinto.activo = activo;

    await recinto.save();
    return res.json(recinto);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ mensaje: 'Ya existe un recinto con ese nombre' });
    }
    return res.status(500).json({ mensaje: 'Error al actualizar el recinto' });
  }
}

module.exports = {
  listarRecintos,
  crearRecinto,
  actualizarRecinto,
};

