const Clase = require('../models/Clase');
const Recinto = require('../models/Recinto');

function validarClase({ nombre, tipoRutina, recinto }, parcial = false) {
  const errores = [];

  if (!parcial || nombre !== undefined) {
    if (!nombre || typeof nombre !== 'string' || !nombre.trim()) {
      errores.push('El nombre de la clase es obligatorio');
    }
  }

  if (!parcial || tipoRutina !== undefined) {
    if (!tipoRutina || typeof tipoRutina !== 'string' || !tipoRutina.trim()) {
      errores.push('El tipo de rutina es obligatorio');
    }
  }

  if (!parcial || recinto !== undefined) {
    if (!recinto || typeof recinto !== 'string' || !recinto.trim()) {
      errores.push('El recinto es obligatorio');
    }
  }

  return errores;
}

// GET /api/clases (HU06)
async function listarClases(req, res) {
  try {
    const filtro = {};
    if (req.query?.propias === 'true' && req.user?.id) {
      filtro.instructor = req.user.id;
    } else if (req.query?.instructor) {
      filtro.instructor = req.query.instructor;
    }
    if (req.query?.recinto) {
      filtro.recinto = req.query.recinto;
    }

    const clases = await Clase.find(filtro)
      .populate('recinto', 'nombre tipo capacidad activo')
      .populate('instructor', 'correo nombreUsuario rol');

    if (req.user?.rol === 'cliente') {
      const visibles = Array.isArray(clases)
        ? clases.filter((c) => c.activa !== false && (!c.recinto || c.recinto.activo !== false))
        : [];
      return res.json(visibles);
    }

    return res.json(clases);
  } catch (err) {
    return res.status(500).json({ mensaje: 'Error al consultar las clases' });
  }
}

// POST /api/clases (HU06, ST02.04)
async function crearClase(req, res) {
  const { nombre, tipoRutina, recinto } = req.body || {};
  const errores = validarClase({ nombre, tipoRutina, recinto }, false);

  if (errores.length) {
    return res.status(400).json({ mensaje: 'Datos inválidos', errores });
  }

  try {
    const recintoDoc = await Recinto.findById(recinto);
    if (!recintoDoc) {
      return res.status(404).json({ mensaje: 'El recinto seleccionado no existe' });
    }
    if (!recintoDoc.activo) {
      return res
        .status(400)
        .json({ mensaje: 'No se puede asignar una clase a un recinto inactivo' });
    }

    const nuevaClase = await Clase.create({
      nombre: nombre.trim(),
      tipoRutina: tipoRutina.trim(),
      recinto: recintoDoc._id || recinto,
      instructor: req.user.id,
      activa: true,
    });

    return res.status(201).json(nuevaClase);
  } catch (err) {
    return res.status(500).json({ mensaje: 'Error al crear la clase' });
  }
}

// PUT / PATCH /api/clases/:id (HU06)
async function actualizarClase(req, res) {
  const { id } = req.params;
  const { nombre, tipoRutina, recinto, activa } = req.body || {};
  const errores = validarClase({ nombre, tipoRutina, recinto }, true);

  if (errores.length) {
    return res.status(400).json({ mensaje: 'Datos inválidos', errores });
  }

  try {
    const clase = await Clase.findById(id);
    if (!clase) {
      return res.status(404).json({ mensaje: 'Clase no encontrada' });
    }

    const instructorId = clase.instructor?._id || clase.instructor;
    if (String(instructorId) !== String(req.user.id)) {
      return res.status(403).json({ mensaje: 'Solo puedes modificar tus propias clases' });
    }

    if (recinto !== undefined) {
      const recintoDoc = await Recinto.findById(recinto);
      if (!recintoDoc) {
        return res.status(404).json({ mensaje: 'El recinto seleccionado no existe' });
      }
      if (!recintoDoc.activo) {
        return res
          .status(400)
          .json({ mensaje: 'No se puede asignar una clase a un recinto inactivo' });
      }
      clase.recinto = recintoDoc._id || recinto;
    }

    if (nombre !== undefined) clase.nombre = nombre.trim();
    if (tipoRutina !== undefined) clase.tipoRutina = tipoRutina.trim();
    if (typeof activa === 'boolean') clase.activa = activa;

    await clase.save();
    return res.json(clase);
  } catch (err) {
    return res.status(500).json({ mensaje: 'Error al actualizar la clase' });
  }
}

module.exports = {
  listarClases,
  crearClase,
  actualizarClase,
};

