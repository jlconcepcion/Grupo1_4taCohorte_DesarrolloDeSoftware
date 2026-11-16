const mongoose = require('mongoose');

const recintoSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    tipo: {
      type: String,
      required: true,
      trim: true,
    },
    descripcion: {
      type: String,
      trim: true,
      default: '',
    },
    capacidad: {
      type: Number,
      required: true,
      min: 1,
    },
    activo: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

recintoSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Recinto', recintoSchema);

