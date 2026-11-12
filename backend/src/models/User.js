const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    correo: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    rol: {
      type: String,
      enum: ['cliente', 'coordinador', 'instructor', 'administrador'],
      default: 'cliente',
    },
    activo: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);