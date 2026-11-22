const express = require('express');
const {
  obtenerMias,
  actualizarMias,
} = require('../controllers/preferencias.controller');

const router = express.Router();

router.get('/', obtenerMias);
router.put('/', actualizarMias);

module.exports = router;
