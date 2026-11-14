/**
 * Esquemas ($jsonSchema) e Índices de MongoDB por Microservicio (TR.03)
 * Revisado contra las Historias de Usuario HU01 a HU05.
 */

const MONGODB_SCHEMAS = {
  // ==========================================================================
  // 1. MICROSERVICIO DE AUTENTICACIÓN Y USUARIOS (auth-service · HU01)
  // ==========================================================================
  auth: {
    roles: {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['codigo', 'nombre', 'permisos'],
          properties: {
            codigo: {
              bsonType: 'string',
              enum: ['cliente', 'coordinador', 'instructor', 'administrador'],
              description: 'Código único del rol RBAC (ST01.05)'
            },
            nombre: { bsonType: 'string', minLength: 3 },
            permisos: { bsonType: 'array' }
          }
        }
      },
      indexes: [
        { key: { codigo: 1 }, options: { unique: true, name: 'uk_roles_codigo' } }
      ]
    },
    usuarios: {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['nombre', 'correo', 'password_hash', 'rol', 'activo', 'creado_en'],
          properties: {
            nombre: { bsonType: 'string', minLength: 2 },
            correo: {
              bsonType: 'string',
              pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
              description: 'Correo único del usuario (ST01.01)'
            },
            password_hash: {
              bsonType: 'string',
              minLength: 20,
              description: 'Hash seguro bcrypt/argon2 (ST01.02)'
            },
            rol: {
              bsonType: 'string',
              enum: ['cliente', 'coordinador', 'instructor', 'administrador'],
              description: 'Rol asignado (ST01.01, ST01.05, ST01.07)'
            },
            activo: { bsonType: 'bool', description: 'Estado activo del usuario (ST01.01)' },
            creado_en: { bsonType: 'string' },
            actualizado_en: { bsonType: 'string' }
          }
        }
      },
      indexes: [
        { key: { correo: 1 }, options: { unique: true, name: 'uk_usuarios_correo' } },
        { key: { rol: 1, activo: 1 }, options: { name: 'idx_usuarios_rol_activo' } }
      ]
    }
  },

  // ==========================================================================
  // 2. MICROSERVICIO DE RECINTOS, CLASES Y HORARIOS (schedule-service · HU02)
  // ==========================================================================
  schedule: {
    recintos: {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['nombre', 'tipo', 'capacidad_maxima', 'activo', 'creado_en'],
          properties: {
            nombre: { bsonType: 'string', minLength: 2 },
            tipo: {
              bsonType: 'string',
              enum: ['cancha', 'gimnasio'],
              description: 'Tipo de recinto (ST02.02)'
            },
            descripcion: { bsonType: 'string' },
            capacidad_maxima: { bsonType: 'int', minimum: 1 },
            activo: {
              bsonType: 'bool',
              description: 'Recinto activo o desactivado conservando historial (ST02.02)'
            },
            creado_en: { bsonType: 'string' },
            actualizado_en: { bsonType: 'string' }
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
          required: ['nombre', 'tipo_rutina', 'instructor_id', 'recinto_id', 'cupo_maximo', 'activa', 'creado_en'],
          properties: {
            nombre: { bsonType: 'string', minLength: 2 },
            tipo_rutina: { bsonType: 'string', minLength: 2 },
            instructor_id: { bsonType: 'string', minLength: 1, description: 'Referencia obligatoria al instructor (ST02.01, ST02.04)' },
            recinto_id: { bsonType: 'string', minLength: 1, description: 'Referencia obligatoria a recinto activo (ST02.01, ST02.04)' },
            cupo_maximo: { bsonType: 'int', minimum: 1 },
            activa: { bsonType: 'bool' },
            creado_en: { bsonType: 'string' }
          }
        }
      },
      indexes: [
        { key: { instructor_id: 1, activa: 1 }, options: { name: 'idx_clases_instructor' } },
        { key: { recinto_id: 1, activa: 1 }, options: { name: 'idx_clases_recinto' } }
      ]
    },
    bloques_disponibilidad: {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['instructor_id', 'recinto_id', 'dia_semana', 'hora_inicio', 'hora_fin', 'activo', 'creado_en'],
          properties: {
            instructor_id: { bsonType: 'string', minLength: 1, description: 'Un bloque no puede existir sin instructor (ST02.01)' },
            recinto_id: { bsonType: 'string', minLength: 1, description: 'Un bloque no puede existir sin recinto (ST02.01)' },
            clase_id: { bsonType: 'string' },
            dia_semana: { bsonType: 'int', minimum: 0, maximum: 6, description: '0=Domingo .. 6=Sábado (ST02.05)' },
            hora_inicio: { bsonType: 'string', pattern: '^([01]\\d|2[0-3]):[0-5]\\d$' },
            hora_fin: { bsonType: 'string', pattern: '^([01]\\d|2[0-3]):[0-5]\\d$' },
            activo: { bsonType: 'bool' },
            actualizado_por_usuario_id: { bsonType: 'string', description: 'Auditoría de cambios del coordinador (ST02.09)' },
            creado_en: { bsonType: 'string' },
            actualizado_en: { bsonType: 'string' }
          }
        }
      },
      indexes: [
        { key: { instructor_id: 1, dia_semana: 1 }, options: { name: 'idx_bloques_instructor_dia' } },
        { key: { recinto_id: 1, dia_semana: 1 }, options: { name: 'idx_bloques_recinto_dia' } }
      ]
    }
  },

  // ==========================================================================
  // 3. MICROSERVICIO DE RESERVAS (reservations-service · HU03)
  // ==========================================================================
  reservations: {
    reservas: {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['cliente_id', 'bloque_id', 'recinto_id', 'fecha_reserva', 'cupo_numero', 'estado', 'recordatorio_enviado', 'creado_en'],
          properties: {
            cliente_id: { bsonType: 'string', minLength: 1 },
            bloque_id: { bsonType: 'string', minLength: 1 },
            recinto_id: { bsonType: 'string', minLength: 1 },
            clase_id: { bsonType: 'string' },
            fecha_reserva: { bsonType: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
            cupo_numero: { bsonType: 'int', minimum: 1 },
            estado: {
              bsonType: 'string',
              enum: ['pendiente', 'confirmada', 'cancelada'],
              description: 'Tres únicos estados permitidos por la BD (ST03.01)'
            },
            recordatorio_enviado: {
              bsonType: 'bool',
              description: 'Evita envío duplicado de recordatorios (ST04.03)'
            },
            recordatorio_enviado_en: { bsonType: 'string' },
            token_confirmacion: { bsonType: 'string', description: 'Token firmado de un solo uso (ST04.04)' },
            token_expira_en: { bsonType: 'string' },
            token_usado_en: { bsonType: 'string' },
            gestionado_por_id: { bsonType: 'string', description: 'Coordinador/Admin que confirmó, canceló o reasignó (ST03.08, ST03.10)' },
            fecha_gestion: { bsonType: 'string' },
            creado_en: { bsonType: 'string' },
            actualizado_en: { bsonType: 'string' }
          }
        }
      },
      indexes: [
        {
          // ST03.02: Impedir reservas duplicadas sobre el mismo cupo y fecha con restricción única parcial
          key: { bloque_id: 1, fecha_reserva: 1, cupo_numero: 1 },
          options: {
            unique: true,
            name: 'uk_reserva_cupo_fecha_activa',
            partialFilterExpression: {
              estado: { $in: ['pendiente', 'confirmada'] }
            }
          }
        },
        { key: { fecha_reserva: 1, recinto_id: 1, estado: 1 }, options: { name: 'idx_reservas_busqueda' } },
        { key: { cliente_id: 1, fecha_reserva: 1 }, options: { name: 'idx_reservas_cliente' } }
      ]
    }
  },

  // ==========================================================================
  // 4. MICROSERVICIO DE NOTIFICACIONES Y REPORTES (notifications-service · HU04)
  // ==========================================================================
  notifications: {
    notificaciones_log: {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['tipo', 'destinatario_correo', 'referencia_id', 'enviado_en', 'estado_envio'],
          properties: {
            tipo: {
              bsonType: 'string',
              enum: ['recordatorio_cliente', 'resumen_instructor', 'reporte_csv']
            },
            destinatario_correo: { bsonType: 'string', minLength: 3 },
            referencia_id: { bsonType: 'string', minLength: 1 },
            enviado_en: { bsonType: 'string' },
            estado_envio: { bsonType: 'string', enum: ['enviado', 'fallido'] }
          }
        }
      },
      indexes: [
        { key: { referencia_id: 1, tipo: 1 }, options: { name: 'idx_notif_ref_tipo' } }
      ]
    }
  },

  // ==========================================================================
  // 5. MICROSERVICIO DE SUGERENCIAS E INDICADORES (feedback-service · HU05)
  // ==========================================================================
  feedback: {
    sugerencias: {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['usuario_id', 'recinto_id', 'categoria', 'texto', 'estado', 'creado_en'],
          properties: {
            usuario_id: { bsonType: 'string', minLength: 1 },
            recinto_id: { bsonType: 'string', minLength: 1 },
            clase_id: { bsonType: 'string', description: 'Opcional según ST05.01' },
            categoria: {
              bsonType: 'string',
              enum: ['instalaciones', 'instructor', 'horarios', 'limpieza', 'atencion', 'otro']
            },
            texto: {
              bsonType: 'string',
              minLength: 1,
              maxLength: 500,
              description: 'Texto con límite de 500 caracteres definido a nivel de BD (ST05.01, ST05.03)'
            },
            estado: {
              bsonType: 'string',
              enum: ['nueva', 'revisada'],
              description: 'Estado de la sugerencia (ST05.01, ST05.04)'
            },
            revisado_por_id: { bsonType: 'string' },
            creado_en: { bsonType: 'string' },
            revisado_en: { bsonType: 'string' }
          }
        }
      },
      indexes: [
        { key: { recinto_id: 1, categoria: 1, estado: 1 }, options: { name: 'idx_sugerencias_filtros' } },
        { key: { creado_en: 1 }, options: { name: 'idx_sugerencias_periodo' } }
      ]
    }
  }
};

module.exports = {
  MONGODB_SCHEMAS
};
