require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');

const USUARIOS = [
  { correo: 'admin@gym.com', password: 'Admin12345', rol: 'administrador' },
  { correo: 'coordinador@gym.com', password: 'Coord12345', rol: 'coordinador' },
  { correo: 'instructor@gym.com', password: 'Instructor12345', rol: 'instructor' },
  { correo: 'cliente@gym.com', password: 'Cliente12345', rol: 'cliente' },
];

async function seed() {
  await connectDB();

  for (const datos of USUARIOS) {
    const usuario = await User.findOne({ correo: datos.correo });

    if (usuario) {
      usuario.rol = datos.rol;
      usuario.password = datos.password;
      usuario.activo = true;
      await usuario.save();
      console.log(`Actualizado: ${datos.correo} / ${datos.password} (${datos.rol})`);
      continue;
    }

    await User.create(datos);
    console.log(`Creado: ${datos.correo} / ${datos.password} (${datos.rol})`);
  }

  await mongoose.disconnect();
  console.log('Seed completado.');
}

seed().catch((error) => {
  console.error('Error en el seed:', error.message);
  process.exit(1);
});
