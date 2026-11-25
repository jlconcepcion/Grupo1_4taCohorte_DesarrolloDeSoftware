/**
 * Definición de esquemas ($jsonSchema) e índices de MongoDB para la base de datos
 * "reservas_gimnasio" (TR.03), alineada con las Historias de Usuario HU01 a HU17
 * y las Épicas 1 a 5.
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
          activo: { bsonType: 'bool' },
          nombreUsuario: { bsonType: 'string', maxLength: 40 },
          telefono: { bsonType: 'string', pattern: '^(\\+?[1-9][0-9]{1,14})?$' },
          preferenciasRecordatorio: {
            bsonType: 'object',
            required: ['activo', 'canales'],
            properties: {
              activo: { bsonType: 'bool' },
              canales: {
                bsonType: 'array',
                minItems: 1,
                uniqueItems: true,
                items: {
                  bsonType: 'string',
                  enum: ['email', 'whatsapp', 'navegacion']
                }
              },
              minutosAnticipacion: {
                bsonType: ['number', 'null'],
                minimum: 5,
                maximum: 1440
              }
            }
          }
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
        required: ['nombre', 'tipo', 'capacidad', 'activo'],
        properties: {
          nombre: { bsonType: 'string', minLength: 2 },
          tipo: { bsonType: 'string', minLength: 2 },
          descripcion: { bsonType: 'string' },
          capacidad: { bsonType: 'number', minimum: 1 },
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
          activa: { bsonType: 'bool' }
        }
      }
    },
    indexes: [
      { key: { instructor: 1, activa: 1 }, options: { name: 'idx_clases_instructor' } },
      { key: { recinto: 1, activa: 1 }, options: { name: 'idx_clases_recinto' } }
    ]
  },

  bloquedisponibilidads: {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['clase', 'instructor', 'recinto', 'diaSemana', 'horaInicio', 'horaFin', 'capacidad'],
        properties: {
          clase: { bsonType: 'objectId' },
          instructor: { bsonType: 'objectId' },
          recinto: { bsonType: 'objectId' },
          diaSemana: { bsonType: 'number', minimum: 0, maximum: 6 },
          horaInicio: { bsonType: 'string', pattern: '^([01]\\d|2[0-3]):[0-5]\\d$' },
          horaFin: { bsonType: 'string', pattern: '^([01]\\d|2[0-3]):[0-5]\\d$' },
          capacidad: { bsonType: 'number', minimum: 1 },
          modificadoPor: { bsonType: ['objectId', 'null'] },
          fechaModificacion: { bsonType: ['date', 'null'] }
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
          clase: { bsonType: ['objectId', 'null'] },
          fecha: { bsonType: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
          estado: {
            bsonType: 'string',
            enum: ['pendiente', 'confirmada', 'cancelada']
          },
          gestionadoPor: { bsonType: ['objectId', 'null'] },
          fechaConfirmacion: { bsonType: ['date', 'null'] },
          fechaCancelacion: { bsonType: ['date', 'null'] },
          motivoCancelacion: { bsonType: ['string', 'null'] },
          recordatorioEnviado: { bsonType: ['bool', 'null'] },
          tokenConfirmacion: { bsonType: ['string', 'null'] },
          tokenExpiraEn: { bsonType: ['date', 'null'] },
          tokenUsadoEn: { bsonType: ['date', 'null'] }
        }
      }
    },
    indexes: [
      {
        // HU11: No se permite duplicar una reserva activa del mismo cliente para el mismo bloque y fecha
        key: { bloque: 1, fecha: 1, cliente: 1 },
        options: {
          unique: true,
          name: 'uk_reservas_cliente_bloque_fecha_activa',
          partialFilterExpression: {
            estado: { $in: ['pendiente', 'confirmada'] }
          }
        }
      },
      { key: { bloque: 1, fecha: 1, estado: 1 }, options: { name: 'idx_reservas_ocupacion_bloque' } },
      { key: { fecha: 1, recinto: 1, estado: 1 }, options: { name: 'idx_reservas_busqueda' } }
    ]
  },

  notificaciones: {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['tipo', 'canal', 'destino', 'estado'],
        properties: {
          reserva: { bsonType: ['objectId', 'null'] },
          destinatario: { bsonType: ['objectId', 'null'] },
          tipo: { bsonType: 'string', enum: ['recordatorio', 'resumen_instructor', 'sistema'] },
          canal: { bsonType: 'string', enum: ['email', 'whatsapp', 'navegacion'] },
          destino: { bsonType: 'string', minLength: 1 },
          asunto: { bsonType: 'string' },
          mensaje: { bsonType: 'string' },
          estado: { bsonType: 'string', enum: ['enviado', 'fallido', 'omitido'] },
          proveedorId: { bsonType: ['string', 'null'] },
          error: { bsonType: ['string', 'null'] },
          fechaEnvio: { bsonType: ['date', 'null'] },
          leida: { bsonType: 'bool' }
        }
      }
    },
    indexes: [
      { key: { destinatario: 1, leida: 1, createdAt: -1 }, options: { name: 'idx_notificaciones_usuario' } },
      {
        key: { reserva: 1, tipo: 1, canal: 1, estado: 1 },
        options: { name: 'idx_notificaciones_idempotencia' }
      },
      { key: { createdAt: -1 }, options: { name: 'idx_notificaciones_recientes' } }
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
