const Sugerencia = require('../models/Sugerencia');
const Recinto = require('../models/Recinto');
const Clase = require('../models/Clase');

const CATEGORIAS_SUGERENCIA =
  Array.isArray(Sugerencia.CATEGORIAS_SUGERENCIA) &&
  Sugerencia.CATEGORIAS_SUGERENCIA.length > 0
    ? Sugerencia.CATEGORIAS_SUGERENCIA
    : ['instalaciones', 'instructor', 'horarios', 'limpieza', 'atencion', 'otro'];

const ESTADOS_SUGERENCIA =
  Array.isArray(Sugerencia.ESTADOS_SUGERENCIA) &&
  Sugerencia.ESTADOS_SUGERENCIA.length > 0
    ? Sugerencia.ESTADOS_SUGERENCIA
    : ['nueva', 'revisada'];

const MAX_LONGITUD_TEXTO = Number(Sugerencia.MAX_LONGITUD_TEXTO) || 500;

const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/;

async function poblarSugerencias(consulta) {
  if (consulta && typeof consulta.populate === 'function') {
    return consulta
      .populate('usuario', 'correo nombreUsuario rol')
      .populate('recinto', 'nombre tipo activo')
      .populate('clase', 'nombre tipoRutina')
      .populate('revisadoPor', 'correo nombreUsuario rol');
  }
  return consulta;
}

function construirRangoFechas(desde, hasta) {
  const rango = {};
  if (desde && FECHA_REGEX.test(String(desde).trim())) {
    const [y, m, d] = String(desde).trim().split('-').map(Number);
    rango.$gte = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
  }
  if (hasta && FECHA_REGEX.test(String(hasta).trim())) {
    const [y, m, d] = String(hasta).trim().split('-').map(Number);
    rango.$lte = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
  }
  return Object.keys(rango).length ? rango : null;
}

// ============================================================================
// POST /api/sugerencias (ST05.02, ST05.03 · Cliente)
// ============================================================================
async function crearSugerencia(req, res) {
  const { recinto, clase, categoria, texto } = req.body || {};
  const errores = [];

  if (!recinto || typeof recinto !== 'string' || !recinto.trim()) {
    errores.push('El recinto es obligatorio');
  }

  if (!categoria || !CATEGORIAS_SUGERENCIA.includes(categoria)) {
    errores.push(
      `La categoría es inválida. Opciones: ${CATEGORIAS_SUGERENCIA.join(', ')}`
    );
  }

  const textoLimpio = typeof texto === 'string' ? texto.trim() : '';
  if (!textoLimpio) {
    errores.push('El texto de la queja o sugerencia no puede estar vacío');
  } else if (textoLimpio.length > MAX_LONGITUD_TEXTO) {
    errores.push(
      `El texto no puede superar los ${MAX_LONGITUD_TEXTO} caracteres (actual: ${textoLimpio.length})`
    );
  }

  if (errores.length) {
    return res.status(400).json({ mensaje: errores[0], errores });
  }

  try {
    const recintoDoc = await Recinto.findById(recinto.trim());
    if (!recintoDoc) {
      return res.status(404).json({ mensaje: 'El recinto seleccionado no existe' });
    }

    let claseId = null;
    if (clase && typeof clase === 'string' && clase.trim() !== '') {
      const claseDoc = await Clase.findById(clase.trim());
      if (!claseDoc) {
        return res.status(404).json({ mensaje: 'La clase seleccionada no existe' });
      }
      claseId = claseDoc._id || clase.trim();
    }

    const nueva = await Sugerencia.create({
      usuario: req.user.id,
      recinto: recintoDoc._id || recinto.trim(),
      clase: claseId,
      categoria,
      texto: textoLimpio,
      estado: 'nueva',
    });

    return res.status(201).json(nueva);
  } catch (err) {
    return res.status(500).json({ mensaje: 'Error al guardar la sugerencia' });
  }
}

// ============================================================================
// GET /api/sugerencias/mias (Cliente)
// ============================================================================
async function listarMisSugerencias(req, res) {
  try {
    const consulta = Sugerencia.find({ usuario: req.user.id });
    const lista = await poblarSugerencias(consulta);
    const arreglo = Array.isArray(lista) ? [...lista] : [];

    arreglo.sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );

    return res.json(arreglo);
  } catch (err) {
    return res.status(500).json({ mensaje: 'Error al consultar tus sugerencias' });
  }
}

// ============================================================================
// GET /api/sugerencias (ST05.04 · Coordinador y Administrador)
// ============================================================================
async function listarSugerencias(req, res) {
  try {
    const { recinto, clase, categoria, estado, desde, hasta } = req.query || {};
    const filtro = {};

    if (recinto) filtro.recinto = recinto;
    if (clase) filtro.clase = clase;
    if (categoria && CATEGORIAS_SUGERENCIA.includes(categoria)) {
      filtro.categoria = categoria;
    }
    if (estado && ESTADOS_SUGERENCIA.includes(estado)) {
      filtro.estado = estado;
    }

    const rangoFecha = construirRangoFechas(desde, hasta);
    if (rangoFecha) {
      filtro.createdAt = rangoFecha;
    }

    const consulta = Sugerencia.find(filtro);
    const sugerencias = await poblarSugerencias(consulta);
    const arreglo = Array.isArray(sugerencias) ? [...sugerencias] : [];

    arreglo.sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );

    return res.json(arreglo);
  } catch (err) {
    return res.status(500).json({ mensaje: 'Error al consultar las sugerencias' });
  }
}

// ============================================================================
// PATCH /api/sugerencias/:id/estado (ST05.04 · Coordinador y Administrador)
// ============================================================================
async function actualizarEstadoSugerencia(req, res) {
  const { id } = req.params;
  const nuevoEstado = req.body?.estado || 'revisada';

  if (!ESTADOS_SUGERENCIA.includes(nuevoEstado)) {
    return res.status(400).json({
      mensaje: `Estado inválido. Opciones: ${ESTADOS_SUGERENCIA.join(', ')}`,
    });
  }

  try {
    const consulta = Sugerencia.findById(id);
    const sugerencia = await poblarSugerencias(consulta);
    if (!sugerencia) {
      return res.status(404).json({ mensaje: 'Sugerencia no encontrada' });
    }

    sugerencia.estado = nuevoEstado;
    sugerencia.revisadoPor = req.user.id;
    sugerencia.fechaRevision = new Date();

    if (typeof sugerencia.save === 'function') {
      await sugerencia.save();
    }

    return res.json(sugerencia);
  } catch (err) {
    return res
      .status(500)
      .json({ mensaje: 'Error al actualizar el estado de la sugerencia' });
  }
}

// ============================================================================
// GET /api/sugerencias/indicadores (ST05.05, ST05.06 · Exclusivo Administrador)
// ============================================================================
async function obtenerIndicadoresSugerencias(req, res) {
  try {
    const { desde, hasta, recinto, clase } = req.query || {};
    const filtro = {};

    if (recinto) filtro.recinto = recinto;
    if (clase) filtro.clase = clase;

    const rangoFecha = construirRangoFechas(desde, hasta);
    if (rangoFecha) {
      filtro.createdAt = rangoFecha;
    }

    const consulta = Sugerencia.find(filtro);
    const sugerencias = await poblarSugerencias(consulta);
    const lista = Array.isArray(sugerencias) ? sugerencias : [];

    let total = 0;
    let nuevas = 0;
    let revisadas = 0;

    const mapaRecintos = new Map();
    const mapaClases = new Map();
    const mapaCategorias = new Map();

    for (const cat of CATEGORIAS_SUGERENCIA) {
      mapaCategorias.set(cat, {
        categoria: cat,
        total: 0,
        nuevas: 0,
        revisadas: 0,
      });
    }

    for (const s of lista) {
      total += 1;
      const esRevisada = s.estado === 'revisada';
      if (esRevisada) revisadas += 1;
      else nuevas += 1;

      // Agrupación por recinto
      const recId = String(s.recinto?._id || s.recinto || 'sin-recinto');
      const recNombre = s.recinto?.nombre || `Recinto ${recId}`;
      if (!mapaRecintos.has(recId)) {
        mapaRecintos.set(recId, {
          recintoId: recId,
          nombre: recNombre,
          total: 0,
          nuevas: 0,
          revisadas: 0,
        });
      }
      const itemRec = mapaRecintos.get(recId);
      itemRec.total += 1;
      if (esRevisada) itemRec.revisadas += 1;
      else itemRec.nuevas += 1;

      // Agrupación por clase (si tiene clase asociada)
      if (s.clase) {
        const clsId = String(s.clase?._id || s.clase);
        const clsNombre = s.clase?.nombre || `Clase ${clsId}`;
        if (!mapaClases.has(clsId)) {
          mapaClases.set(clsId, {
            claseId: clsId,
            nombre: clsNombre,
            total: 0,
            nuevas: 0,
            revisadas: 0,
          });
        }
        const itemCls = mapaClases.get(clsId);
        itemCls.total += 1;
        if (esRevisada) itemCls.revisadas += 1;
        else itemCls.nuevas += 1;
      }

      // Agrupación por categoría
      const catKey = s.categoria || 'otro';
      if (!mapaCategorias.has(catKey)) {
        mapaCategorias.set(catKey, {
          categoria: catKey,
          total: 0,
          nuevas: 0,
          revisadas: 0,
        });
      }
      const itemCat = mapaCategorias.get(catKey);
      itemCat.total += 1;
      if (esRevisada) itemCat.revisadas += 1;
      else itemCat.nuevas += 1;
    }

    const porcentajeRevisadas =
      total > 0 ? Math.round((revisadas / total) * 100) : 0;

    return res.json({
      periodo: {
        desde: desde || null,
        hasta: hasta || null,
      },
      resumen: {
        total,
        nuevas,
        revisadas,
        porcentajeRevisadas,
      },
      porRecinto: Array.from(mapaRecintos.values()).sort((a, b) => b.total - a.total),
      porClase: Array.from(mapaClases.values()).sort((a, b) => b.total - a.total),
      porCategoria: Array.from(mapaCategorias.values()).sort((a, b) => b.total - a.total),
    });
  } catch (err) {
    return res
      .status(500)
      .json({ mensaje: 'Error al calcular los indicadores de sugerencias' });
  }
}

module.exports = {
  crearSugerencia,
  listarMisSugerencias,
  listarSugerencias,
  actualizarEstadoSugerencia,
  obtenerIndicadoresSugerencias,
};
