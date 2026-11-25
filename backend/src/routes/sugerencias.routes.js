const express = require('express');
const { requirePermiso } = require('../middlewares/roles');
const {
  crearSugerencia,
  listarMisSugerencias,
  listarSugerencias,
  actualizarEstadoSugerencia,
  obtenerIndicadoresSugerencias,
} = require('../controllers/sugerencias.controller');

const router = express.Router();

// Indicadores de desempeño para el administrador (ST05.05)
router.get('/indicadores', requirePermiso('indicadores:ver'), obtenerIndicadoresSugerencias);

// Mis sugerencias enviadas como cliente
router.get('/mias', requirePermiso('sugerencias:crear'), listarMisSugerencias);

// Listado global filtrable para coordinador y administrador (ST05.04)
router.get('/', requirePermiso('sugerencias:ver'), listarSugerencias);

// Enviar queja o sugerencia como cliente (ST05.02, ST05.03)
router.post('/', requirePermiso('sugerencias:crear'), crearSugerencia);

// Marcar como revisada o cambiar estado (ST05.04)
router.patch('/:id/estado', requirePermiso('sugerencias:ver'), actualizarEstadoSugerencia);
router.patch('/:id/revisar', requirePermiso('sugerencias:ver'), actualizarEstadoSugerencia);

module.exports = router;
