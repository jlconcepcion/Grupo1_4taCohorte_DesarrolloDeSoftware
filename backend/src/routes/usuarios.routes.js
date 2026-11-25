const express = require('express');
const { requirePermiso } = require('../middlewares/roles');
const {
  listarUsuarios,
  crearUsuario,
  actualizarPerfilUsuario,
} = require('../controllers/usuarios.controller');
const {
  obtenerDeUsuario,
  actualizarDeUsuario,
} = require('../controllers/preferencias.controller');

const router = express.Router();

router.get('/', requirePermiso('usuarios:crear'), listarUsuarios);
router.post('/', requirePermiso('usuarios:crear'), crearUsuario);
router.patch('/:id', actualizarPerfilUsuario);
router.get(
  '/:id/preferencias-recordatorio',
  requirePermiso('usuarios:crear'),
  obtenerDeUsuario
);
router.put(
  '/:id/preferencias-recordatorio',
  requirePermiso('usuarios:crear'),
  actualizarDeUsuario
);

module.exports = router;
