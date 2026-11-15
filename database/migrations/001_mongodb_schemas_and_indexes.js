/**
 * Definición de esquemas ($jsonSchema) e índices de MongoDB para la base de datos
 * "reservas_gimnasio" (TR.03), alineada con los modelos Mongoose del backend (HU01 a HU05).
 */

const MONGODB_SCHEMAS = {
  users: {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['correo', 'password', 'rol', 'activo'],
        properties: {
          correo: { bsonType: 'string', pattern: '^\\S+@\\S+\\.\\S+$' },
          password: { bsonType: 'string', minLength: 20 },
          rol: {
            bsonType: 'string',
            enum: ['cliente', 'coordinador', 'instructor', 'administrador']
          },
          activo: { bsonType: 'bool' }
        }
      }
    },
    indexes: [
      { key: { correo: 1 }, options: { unique: true, name: 'uk_users_correo' } }
    ]
  },

  recintos: {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['nombre', 'tipo', 'activo'],
        properties: {
          nombre: { bsonType: 'string', minLength: 2 },
          tipo: { bsonType: 'string', enum: ['cancha', 'gimnasio'] },
          descripcion: { bsonType: 'string' },
          capacidad: { bsonType: 'int', minimum: 1 },
          activo: { bsonType: 'bool' }
        }
      }
    },
    indexes: [
      { key: { nombre: 1 }, options: { unique: true, name: 'uk_recintos_nombre' } },
      { key: { activo: 1, tipo: 1 }, options: { name: 'idx_recintos_activo_tipo' } }
    ]
  },

  clases: {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['nombre', 'tipoRutina', 'instructor', 'recinto'],
        properties: {
          nombre: { bsonType: 'string', minLength: 2 },
          tipoRutina: { bsonType: 'string', minLength: 2 },
          instructor: { bsonType: 'objectId' },
          recinto: { bsonType: 'objectId' },
          cupoMaximo: { bsonType: 'int', minimum: 1 },
          activa: { bsonType: 'bool' }
        }
      }
    },
    indexes: [
      { key: { instructor: 1, activa: 1 }, options: { name: 'idx_clases_instructor' } },
      { key: { recinto: 1, activa: 1 }, options: { name: 'idx_clases_recinto' } }
    ]
  },

  bloques: {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['instructor', 'recinto', 'diaSemana', 'horaInicio', 'horaFin'],
        properties: {
          instructor: { bsonType: 'objectId' },
          recinto: { bsonType: 'objectId' },
          clase: { bsonType: 'objectId' },
          diaSemana: { bsonType: 'int', minimum: 0, maximum: 6 },
          horaInicio: { bsonType: 'string', pattern: '^([01]\\d|2[0-3]):[0-5]\\d$' },
          horaFin: { bsonType: 'string', pattern: '^([01]\\d|2[0-3]):[0-5]\\d$' },
          modificadoPor: { bsonType: 'objectId' }
        }
      }
    },
    indexes: [
      { key: { instructor: 1, diaSemana: 1 }, options: { name: 'idx_bloques_instructor_dia' } },
      { key: { recinto: 1, diaSemana: 1 }, options: { name: 'idx_bloques_recinto_dia' } }
    ]
  },

  reservas: {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['cliente', 'bloque', 'recinto', 'fecha', 'estado'],
        properties: {
          cliente: { bsonType: 'objectId' },
          bloque: { bsonType: 'objectId' },
          recinto: { bsonType: 'objectId' },
          clase: { bsonType: 'objectId' },
          fecha: { bsonType: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
          cupoNumero: { bsonType: 'int', minimum: 1 },
          estado: {
            bsonType: 'string',
            enum: ['pendiente', 'confirmada', 'cancelada']
          },
          recordatorioEnviado: { bsonType: 'bool' },
          tokenConfirmacion: { bsonType: 'string' },
          gestionadoPor: { bsonType: 'objectId' }
        }
      }
    },
    indexes: [
      {
        // ST03.02: Impedir reservas duplicadas sobre el mismo cupo y fecha
        key: { bloque: 1, fecha: 1, cupoNumero: 1 },
        options: {
          unique: true,
          name: 'uk_reservas_bloque_fecha_cupo_activo',
          partialFilterExpression: {
            estado: { $in: ['pendiente', 'confirmada'] }
          }
        }
      },
      { key: { fecha: 1, recinto: 1, estado: 1 }, options: { name: 'idx_reservas_busqueda' } }
    ]
  },

  sugerencias: {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['usuario', 'recinto', 'categoria', 'texto', 'estado'],
        properties: {
          usuario: { bsonType: 'objectId' },
          recinto: { bsonType: 'objectId' },
          clase: { bsonType: 'objectId' },
          categoria: {
            bsonType: 'string',
            enum: ['instalaciones', 'instructor', 'horarios', 'limpieza', 'atencion', 'otro']
          },
          texto: { bsonType: 'string', minLength: 1, maxLength: 500 },
          estado: { bsonType: 'string', enum: ['nueva', 'revisada'] },
          revisadoPor: { bsonType: 'objectId' }
        }
      }
    },
    indexes: [
      { key: { recinto: 1, categoria: 1, estado: 1 }, options: { name: 'idx_sugerencias_filtros' } }
    ]
  }
};

module.exports = { MONGODB_SCHEMAS };
