const express = require('express');
const { requirePermiso } = require('../middlewares/roles');
const {
  listarNotificaciones,
  listarMias,
  marcarLeida,
  reenviar,
  enviarResumen,
} = require('../controllers/notificaciones.controller');

const router = express.Router();

router.get('/mias', listarMias);
router.patch('/:id/leida', marcarLeida);
router.get('/', requirePermiso('reportes:ver'), listarNotificaciones);
router.post('/resumen-instructor', requirePermiso('reservas:gestionar'), enviarResumen);
router.post('/:id/reenviar', requirePermiso('reservas:gestionar'), reenviar);

module.exports = router;
