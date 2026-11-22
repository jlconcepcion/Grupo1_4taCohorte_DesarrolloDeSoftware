const express = require('express');
const { requirePermiso } = require('../middlewares/roles');
const { descargarReservasCsv } = require('../controllers/reportes.controller');

const router = express.Router();

router.get('/reservas.csv', requirePermiso('reportes:ver'), descargarReservasCsv);

module.exports = router;
