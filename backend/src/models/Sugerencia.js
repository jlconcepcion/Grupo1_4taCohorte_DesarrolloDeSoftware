const mongoose = require('mongoose');

const CATEGORIAS_SUGERENCIA = [
  'instalaciones',
  'instructor',
  'horarios',
  'limpieza',
  'atencion',
  'otro',
];

const ESTADOS_SUGERENCIA = ['nueva', 'revisada'];
const MAX_LONGITUD_TEXTO = 500;

const sugerenciaSchema = new mongoose.Schema(
  {
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
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
    categoria: {
      type: String,
      enum: CATEGORIAS_SUGERENCIA,
      required: true,
    },
    texto: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: MAX_LONGITUD_TEXTO,
    },
    estado: {
      type: String,
      enum: ESTADOS_SUGERENCIA,
      default: 'nueva',
    },
    revisadoPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    fechaRevision: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

sugerenciaSchema.index({ recinto: 1, categoria: 1, estado: 1 });
sugerenciaSchema.index({ createdAt: -1 });

sugerenciaSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Sugerencia', sugerenciaSchema);
module.exports.CATEGORIAS_SUGERENCIA = CATEGORIAS_SUGERENCIA;
module.exports.ESTADOS_SUGERENCIA = ESTADOS_SUGERENCIA;
module.exports.MAX_LONGITUD_TEXTO = MAX_LONGITUD_TEXTO;
