const express = require('express');
const { requirePermiso } = require('../middlewares/roles');
const {
  listarRecintos,
  crearRecinto,
  actualizarRecinto,
} = require('../controllers/recintos.controller');

const router = express.Router();

router.get('/', requirePermiso('recintos:ver'), listarRecintos);
router.post('/', requirePermiso('recintos:gestionar'), crearRecinto);
router.put('/:id', requirePermiso('recintos:gestionar'), actualizarRecinto);
router.patch('/:id', requirePermiso('recintos:gestionar'), actualizarRecinto);

module.exports = router;

