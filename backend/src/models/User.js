const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ROLES } = require('../config/permisos');

const userSchema = new mongoose.Schema(
  {
    correo: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    rol: { type: String, enum: ROLES, default: 'cliente' },
    activo: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Cifra la contraseña antes de guardar (solo si cambió)
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

// Nunca devolver la contraseña en las respuestas JSON
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.password;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);