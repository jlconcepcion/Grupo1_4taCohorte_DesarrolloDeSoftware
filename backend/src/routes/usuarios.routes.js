const express = require('express');
const { requirePermiso } = require('../middlewares/roles');
const { listarUsuarios, crearUsuario } = require('../controllers/usuarios.controller');

const router = express.Router();

router.get('/', requirePermiso('usuarios:crear'), listarUsuarios);
router.post('/', requirePermiso('usuarios:crear'), crearUsuario);

module.exports = router;
