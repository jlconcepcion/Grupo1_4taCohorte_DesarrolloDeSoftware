const express = require('express');
const {
  listarBloques,
  crearBloque,
  actualizarBloque,
  eliminarBloque,
} = require('../controllers/bloques.controller');

const router = express.Router();

router.get('/', listarBloques);
router.post('/', crearBloque);
router.put('/:id', actualizarBloque);
router.patch('/:id', actualizarBloque);
router.delete('/:id', eliminarBloque);

module.exports = router;

