const mongoose = require('mongoose');

const claseSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: true,
      trim: true,
    },
    tipoRutina: {
      type: String,
      required: true,
      trim: true,
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
    activa: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

claseSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Clase', claseSchema);

