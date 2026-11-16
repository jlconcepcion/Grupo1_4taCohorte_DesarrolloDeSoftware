const express = require('express');
const { requirePermiso } = require('../middlewares/roles');
const {
  listarClases,
  crearClase,
  actualizarClase,
} = require('../controllers/clases.controller');

const router = express.Router();

router.get('/', listarClases);
router.post('/', requirePermiso('clases:propias'), crearClase);
router.put('/:id', requirePermiso('clases:propias'), actualizarClase);
router.patch('/:id', requirePermiso('clases:propias'), actualizarClase);

module.exports = router;

