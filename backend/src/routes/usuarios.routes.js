const router = require('express').Router();
const { requirePermiso } = require('../middlewares/roles');
const { crearUsuario } = require('../controllers/usuarios.controller');

router.post('/', requirePermiso('usuarios:crear'), crearUsuario);

module.exports = router;