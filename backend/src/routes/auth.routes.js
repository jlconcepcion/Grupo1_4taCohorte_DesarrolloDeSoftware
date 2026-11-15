const router = require('express').Router();
const { autenticar } = require('../middlewares/auth');
const { registro, login, perfil } = require('../controllers/auth.controller');

router.post('/registro', registro);
router.post('/login', login);
router.get('/perfil', autenticar, perfil);

module.exports = router;
