const mongoose = require('mongoose');

const ESTADOS_RESERVA = ['pendiente', 'confirmada', 'cancelada'];

const cambioReservaSchema = new mongoose.Schema(
  {
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    rol: {
      type: String,
      required: true,
    },
    fecha: {
      type: Date,
      default: Date.now,
    },
    resumen: {
      type: String,
      default: '',
    },
  },
  { _id: false }
);

const reservaSchema = new mongoose.Schema(
  {
    cliente: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    bloque: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BloqueDisponibilidad',
      required: true,
    },
    recinto: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Recinto',
      required: true,
    },
    clase: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clase',
      default: null,
    },
    fecha: {
      type: String,
      required: true,
      trim: true,
    },
    estado: {
      type: String,
      enum: ESTADOS_RESERVA,
      default: 'pendiente',
    },
    gestionadoPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    fechaConfirmacion: {
      type: Date,
      default: null,
    },
    fechaCancelacion: {
      type: Date,
      default: null,
    },
    motivoCancelacion: {
      type: String,
      default: '',
    },
    historialCambios: {
      type: [cambioReservaSchema],
      default: [],
    },
  },
  { timestamps: true }
);

reservaSchema.index(
  { bloque: 1, fecha: 1, cliente: 1 },
  {
    unique: true,
    partialFilterExpression: { estado: { $in: ['pendiente', 'confirmada'] } },
  }
);

reservaSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Reserva', reservaSchema);
module.exports.ESTADOS_RESERVA = ESTADOS_RESERVA;

