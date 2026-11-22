require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Recinto = require('../models/Recinto');
const Clase = require('../models/Clase');
const BloqueDisponibilidad = require('../models/BloqueDisponibilidad');

const USUARIOS = [
  {
    correo: 'admin@gym.com',
    password: 'Admin12345',
    rol: 'administrador',
    telefono: '+573000000001',
  },
  {
    correo: 'coordinador@gym.com',
    password: 'Coord12345',
    rol: 'coordinador',
    telefono: '+573000000002',
  },
  {
    correo: 'instructor@gym.com',
    password: 'Instructor12345',
    rol: 'instructor',
    telefono: '+573000000003',
  },
  {
    correo: 'cliente@gym.com',
    password: 'Cliente12345',
    rol: 'cliente',
    telefono: '+573000000004',
  },
];

const RECINTOS_BASE = [
  {
    nombre: 'Cancha 1',
    tipo: 'Fútbol 5',
    descripcion: 'Cancha sintética techada para partidos y circuitos grupales.',
    capacidad: 10,
    activo: true,
  },
  {
    nombre: 'Sala Funcional Principal',
    tipo: 'Gimnasio',
    descripcion: 'Área equipada con pesas libres, barras y entrenamiento funcional.',
    capacidad: 15,
    activo: true,
  },
  {
    nombre: 'Sala de Spinning',
    tipo: 'Gimnasio',
    descripcion: 'Sala climatizada de ciclismo indoor de alta intensidad.',
    capacidad: 12,
    activo: true,
  },
];

async function seed() {
  await connectDB();

  const usuariosPorRol = {};
  for (const datos of USUARIOS) {
    let usuario = await User.findOne({ correo: datos.correo });

    if (usuario) {
      usuario.rol = datos.rol;
      usuario.password = datos.password;
      usuario.activo = true;
      await usuario.save();
      console.log(`Actualizado: ${datos.correo} / ${datos.password} (${datos.rol})`);
    } else {
      usuario = await User.create(datos);
      console.log(`Creado: ${datos.correo} / ${datos.password} (${datos.rol})`);
    }
    usuariosPorRol[datos.rol] = usuario;
  }

  const recintosCreados = {};
  for (const r of RECINTOS_BASE) {
    const recinto = await Recinto.findOneAndUpdate(
      { nombre: r.nombre },
      { $set: r },
      { returnDocument: 'after', upsert: true }
    );
    recintosCreados[r.nombre] = recinto;
    console.log(`Recinto listo: ${recinto.nombre} (${recinto.tipo}, cap: ${recinto.capacidad})`);
  }

  const instructor = usuariosPorRol.instructor;
  const recintoFuncional = recintosCreados['Sala Funcional Principal'];
  const recintoCancha = recintosCreados['Cancha 1'];

  if (instructor && recintoFuncional && recintoCancha) {
    let claseFuncional = await Clase.findOne({
      nombre: 'Entrenamiento Funcional',
      instructor: instructor._id,
    });
    if (!claseFuncional) {
      claseFuncional = await Clase.create({
        nombre: 'Entrenamiento Funcional',
        tipoRutina: 'Fuerza y resistencia',
        instructor: instructor._id,
        recinto: recintoFuncional._id,
        activa: true,
      });
    }

    let claseCancha = await Clase.findOne({
      nombre: 'Acondicionamiento en Cancha',
      instructor: instructor._id,
    });
    if (!claseCancha) {
      claseCancha = await Clase.create({
        nombre: 'Acondicionamiento en Cancha',
        tipoRutina: 'Cardio y agilidad',
        instructor: instructor._id,
        recinto: recintoCancha._id,
        activa: true,
      });
    }

    const bloquesSemilla = [
      {
        clase: claseFuncional._id,
        instructor: instructor._id,
        recinto: recintoFuncional._id,
        diaSemana: 2, // Martes
        horaInicio: '16:00',
        horaFin: '18:00',
        capacidad: 12,
      },
      {
        clase: claseCancha._id,
        instructor: instructor._id,
        recinto: recintoCancha._id,
        diaSemana: 4, // Jueves
        horaInicio: '18:00',
        horaFin: '20:00',
        capacidad: 10,
      },
    ];

    for (const b of bloquesSemilla) {
      const existe = await BloqueDisponibilidad.findOne({
        instructor: b.instructor,
        diaSemana: b.diaSemana,
        horaInicio: b.horaInicio,
      });
      if (!existe) {
        await BloqueDisponibilidad.create(b);
      }
    }
    console.log('Clases y bloques de disponibilidad iniciales verificados.');
  }

  await mongoose.disconnect();
  console.log('Seed completado.');
}

seed().catch((error) => {
  console.error('Error en el seed:', error.message);
  process.exit(1);
});
