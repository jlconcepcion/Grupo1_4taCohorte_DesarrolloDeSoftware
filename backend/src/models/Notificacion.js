const mongoose = require('mongoose');

const TIPOS = ['recordatorio', 'resumen_instructor', 'sistema'];
const CANALES = ['email', 'whatsapp', 'navegacion'];
const ESTADOS = ['enviado', 'fallido', 'omitido'];

const notificacionSchema = new mongoose.Schema(
  {
    reserva: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reserva',
      default: null,
    },
    destinatario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    tipo: {
      type: String,
      enum: TIPOS,
      required: true,
    },
    canal: {
      type: String,
      enum: CANALES,
      required: true,
    },
    destino: {
      type: String,
      required: true,
      trim: true,
    },
    asunto: {
      type: String,
      default: '',
    },
    mensaje: {
      type: String,
      default: '',
    },
    estado: {
      type: String,
      enum: ESTADOS,
      required: true,
    },
    proveedorId: {
      type: String,
      default: null,
    },
    error: {
      type: String,
      default: null,
    },
    fechaEnvio: {
      type: Date,
      default: null,
    },
    leida: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

notificacionSchema.index(
  { reserva: 1, tipo: 1, canal: 1, estado: 1 },
  { name: 'idx_notificaciones_idempotencia' }
);
notificacionSchema.index({ createdAt: -1 }, { name: 'idx_notificaciones_recientes' });

notificacionSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Notificacion', notificacionSchema);
module.exports.TIPOS = TIPOS;
module.exports.CANALES = CANALES;
module.exports.ESTADOS = ESTADOS;
