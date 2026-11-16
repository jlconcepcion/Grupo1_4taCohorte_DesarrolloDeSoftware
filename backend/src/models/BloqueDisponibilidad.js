const mongoose = require('mongoose');

const cambioHorarioSchema = new mongoose.Schema(
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

const bloqueDisponibilidadSchema = new mongoose.Schema(
  {
    clase: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clase',
      required: true,
    },
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    recinto: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Recinto',
      required: true,
    },
    diaSemana: {
      type: Number,
      required: true,
      min: 0,
      max: 6,
    },
    horaInicio: {
      type: String,
      required: true,
      trim: true,
    },
    horaFin: {
      type: String,
      required: true,
      trim: true,
    },
    capacidad: {
      type: Number,
      required: true,
      min: 1,
    },
    reservasActivas: {
      type: Number,
      default: 0,
      min: 0,
    },
    modificadoPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    fechaModificacion: {
      type: Date,
      default: null,
    },
    historialCambios: {
      type: [cambioHorarioSchema],
      default: [],
    },
  },
  { timestamps: true }
);

bloqueDisponibilidadSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('BloqueDisponibilidad', bloqueDisponibilidadSchema);

