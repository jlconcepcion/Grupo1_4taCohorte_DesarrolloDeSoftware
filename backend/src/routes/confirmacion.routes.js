const express = require('express');
const { confirmarAsistenciaPorToken } = require('../controllers/notificaciones.controller');

const router = express.Router();

router.get('/', confirmarAsistenciaPorToken);

module.exports = router;
