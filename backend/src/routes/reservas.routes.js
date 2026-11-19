const express = require('express');
const { requirePermiso } = require('../middlewares/roles');
const {
  consultarDisponibilidad,
  crearReserva,
  listarMisReservas,
  confirmarAsistenciaCliente,
  cancelarReservaPropia,
  listarReservas,
  confirmarReservaCoordinador,
  cancelarReservaCoordinador,
  reasignarReservaAdmin,
  conteoReservasPorInstructor,
} = require('../controllers/reservas.controller');

const router = express.Router();

// Consulta de disponibilidad en tiempo real (HU10, ST03.03)
router.get('/disponibilidad', requirePermiso('recintos:ver'), consultarDisponibilidad);

// Mis reservas del cliente autenticado (HU13)
router.get('/mias', requirePermiso('reservas:crear'), listarMisReservas);

// Conteo de reservas y confirmadas para el instructor (ST03.09)
router.get('/conteo-instructor', requirePermiso('reservas:conteo'), conteoReservasPorInstructor);

// Listado global filtrable para coordinador y administrador (HU15, ST03.07)
router.get('/', requirePermiso('reservas:gestionar'), listarReservas);

// Reservar un cupo como cliente (HU11, ST03.05)
router.post('/', requirePermiso('reservas:crear'), crearReserva);

// Confirmar asistencia propia hasta 1h antes (HU14)
router.patch('/:id/confirmar-asistencia', requirePermiso('reservas:crear'), confirmarAsistenciaCliente);
router.post('/:id/confirmar-asistencia', requirePermiso('reservas:crear'), confirmarAsistenciaCliente);

// Cancelar reserva propia como cliente (HU12, ST03.06)
router.patch('/:id/cancelar-propia', requirePermiso('reservas:cancelar-propia'), cancelarReservaPropia);
router.post('/:id/cancelar-propia', requirePermiso('reservas:cancelar-propia'), cancelarReservaPropia);

// Confirmar o cancelar reserva como coordinador o administrador (HU16, HU17, ST03.08)
router.patch('/:id/confirmar', requirePermiso('reservas:gestionar'), confirmarReservaCoordinador);
router.post('/:id/confirmar', requirePermiso('reservas:gestionar'), confirmarReservaCoordinador);
router.patch('/:id/cancelar', requirePermiso('reservas:gestionar'), cancelarReservaCoordinador);
router.post('/:id/cancelar', requirePermiso('reservas:gestionar'), cancelarReservaCoordinador);

// Editar / reasignar reserva como administrador (ST03.10)
router.patch('/:id/reasignar', requirePermiso('reservas:reasignar'), reasignarReservaAdmin);
router.put('/:id/reasignar', requirePermiso('reservas:reasignar'), reasignarReservaAdmin);

module.exports = router;
