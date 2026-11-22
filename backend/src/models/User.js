const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ROLES } = require('../config/permisos');
const {
  CANALES_RECORDATORIO,
  preferenciasRecordatorioPorDefecto,
} = require('../config/notificaciones');

const userSchema = new mongoose.Schema(
  {
    correo: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    rol: { type: String, enum: ROLES, default: 'cliente' },
    activo: { type: Boolean, default: true },
    telefono: {
      type: String,
      trim: true,
      default: '',
      validate: {
        validator: (valor) => !valor || /^\+?[1-9]\d{1,14}$/.test(valor),
        message: 'El teléfono debe estar en formato E.164',
      },
    },
    preferenciasRecordatorio: {
      type: {
        activo: { type: Boolean, default: true },
        canales: {
          type: [String],
          enum: CANALES_RECORDATORIO,
          default: () => [...CANALES_RECORDATORIO],
        },
        minutosAnticipacion: {
          type: Number,
          default: null,
          validate: {
            validator: (valor) =>
              valor === null || (Number.isFinite(valor) && valor >= 5 && valor <= 1440),
            message: 'minutosAnticipacion debe estar entre 5 y 1440 o ser null',
          },
        },
      },
      default: preferenciasRecordatorioPorDefecto,
    },
  },
  { timestamps: true }
);

// Cifra la contraseña antes de guardar (solo si cambió)
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

// Compara una contraseña en texto plano con el hash almacenado
userSchema.methods.compararPassword = function (password) {
  return bcrypt.compare(password, this.password);
};

// Nunca devolver la contraseña en las respuestas JSON
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.password;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);