process.env.JWT_SECRET = 'secreto-de-prueba-sprint4';
process.env.NOTIFICACION_TOKEN_SECRET = 'secreto-notificaciones-sprint4';
process.env.NOTIFICACION_TOKEN_TTL = '2h';
delete process.env.FRONTEND_URL;

jest.mock('../src/models/User');
jest.mock('../src/models/Recinto');
jest.mock('../src/models/Clase');
jest.mock('../src/models/BloqueDisponibilidad');
jest.mock('../src/models/Reserva');
jest.mock('../src/models/Notificacion');
jest.mock('../src/services/canales/email.adapter', () => ({ enviar: jest.fn() }));
jest.mock('../src/services/canales/whatsapp.adapter', () => ({
  enviar: jest.fn(),
  normalizarDestino: jest.fn((valor) => `whatsapp:${valor}`),
}));

const request = require('supertest');
const app = require('../src/app');
const { firmarToken } = require('../src/config/jwt');
const User = require('../src/models/User');
const Clase = require('../src/models/Clase');
const Reserva = require('../src/models/Reserva');
const Notificacion = require('../src/models/Notificacion');
const BloqueDisponibilidad = require('../src/models/BloqueDisponibilidad');
const emailAdapter = require('../src/services/canales/email.adapter');
const whatsappAdapter = require('../src/services/canales/whatsapp.adapter');
const {
  generarTokenAsistencia,
  enviarRecordatorio,
} = require('../src/services/notificaciones.service');

function fechaRelativa(dias) {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + dias);
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(
    fecha.getDate()
  ).padStart(2, '0')}`;
}

function tokenPara(rol, id = 'usr-1') {
  return firmarToken({ _id: id, rol });
}

function consultaReserva(reserva) {
  const consulta = { populate: jest.fn() };
  consulta.populate.mockReturnValue(consulta);
  consulta.then = (resolve, reject) => Promise.resolve(reserva).then(resolve, reject);
  return consulta;
}

function reservaBase() {
  return {
    _id: 'res-1',
    cliente: {
      _id: 'cli-1',
      correo: 'cliente@gym.com',
      telefono: '+573000000004',
    },
    clase: { _id: 'cls-1', nombre: 'Funcional' },
    recinto: { _id: 'rec-1', nombre: 'Cancha 1' },
    bloque: { _id: 'blq-1', horaInicio: '23:59', instructor: { _id: 'inst-1' } },
    fecha: fechaRelativa(1),
    estado: 'pendiente',
    recordatorioEnviado: false,
    tokenConfirmacion: null,
    tokenUsadoEn: null,
    save: jest.fn(),
  };
}

beforeEach(() => {
  jest.resetAllMocks();
  delete process.env.TWILIO_MODO_SIMULACION;
  Notificacion.create.mockResolvedValue({});
  Notificacion.findOne.mockResolvedValue(null);
  emailAdapter.enviar.mockResolvedValue({ estado: 'enviado', proveedorId: 'smtp-1' });
  whatsappAdapter.enviar.mockResolvedValue({ estado: 'enviado', proveedorId: 'tw-1' });
});

describe('HU04 · Notificaciones multi-canal (ST04.09 a ST04.12)', () => {
  it('envía por correo, WhatsApp y navegación y marca éxito cuando al menos un canal llega', async () => {
    whatsappAdapter.enviar.mockRejectedValueOnce(new Error('Twilio caído'));
    const reserva = reservaBase();

    const resultado = await enviarRecordatorio(reserva);

    expect(emailAdapter.enviar).toHaveBeenCalledTimes(1);
    expect(whatsappAdapter.enviar).toHaveBeenCalledTimes(1);
    expect(Notificacion.create).toHaveBeenCalledTimes(3);
    expect(Notificacion.create).toHaveBeenCalledWith(
      expect.objectContaining({ canal: 'email', estado: 'enviado' })
    );
    expect(Notificacion.create).toHaveBeenCalledWith(
      expect.objectContaining({ canal: 'whatsapp', estado: 'fallido' })
    );
    expect(Notificacion.create).toHaveBeenCalledWith(
      expect.objectContaining({ canal: 'navegacion', estado: 'enviado' })
    );
    expect(reserva.recordatorioEnviado).toBe(true);
    expect(reserva.tokenConfirmacion).toEqual(expect.any(String));
    expect(resultado.resultados).toHaveLength(3);
  });

  it('no reenvía canales que ya fueron enviados correctamente', async () => {
    Notificacion.findOne.mockResolvedValue({ _id: 'not-1' });
    const reserva = reservaBase();

    const resultado = await enviarRecordatorio(reserva);

    expect(emailAdapter.enviar).not.toHaveBeenCalled();
    expect(whatsappAdapter.enviar).not.toHaveBeenCalled();
    expect(resultado.resultados.every((item) => item.yaEnviado)).toBe(true);
  });

  it('confirma la asistencia desde un token público antes del inicio de la clase', async () => {
    const token = generarTokenAsistencia({ _id: 'res-1' });
    const reserva = { ...reservaBase(), tokenConfirmacion: token };
    Reserva.findById.mockReturnValue({
      populate: jest.fn().mockResolvedValue(reserva),
    });

    const respuesta = await request(app).get(
      `/api/notificaciones/confirmar-asistencia?token=${encodeURIComponent(token)}`
    );

    expect(respuesta.statusCode).toBe(200);
    expect(respuesta.body.ok).toBe(true);
    expect(reserva.estado).toBe('confirmada');
    expect(reserva.tokenUsadoEn).toEqual(expect.any(Date));
    expect(reserva.save).toHaveBeenCalledTimes(1);
  });

  it('rechaza un token inválido en el enlace público', async () => {
    const respuesta = await request(app).get(
      '/api/notificaciones/confirmar-asistencia?token=token-invalido'
    );
    expect(respuesta.statusCode).toBe(400);
    expect(respuesta.body.ok).toBe(false);
  });

  it('reenvía solo el canal fallido desde el endpoint de auditoría', async () => {
    const token = generarTokenAsistencia({ _id: 'res-1' });
    const reserva = { ...reservaBase(), tokenConfirmacion: token };
    const notificacion = {
      _id: 'not-1',
      estado: 'fallido',
      tipo: 'recordatorio',
      canal: 'whatsapp',
      reserva,
      save: jest.fn(),
    };
    Notificacion.findById.mockReturnValue({
      populate: jest.fn().mockResolvedValue(notificacion),
    });

    const respuesta = await request(app)
      .post('/api/notificaciones/not-1/reenviar')
      .set('Authorization', `Bearer ${tokenPara('coordinador', 'coord-1')}`);

    expect(respuesta.statusCode).toBe(200);
    expect(whatsappAdapter.enviar).toHaveBeenCalledTimes(1);
    expect(emailAdapter.enviar).not.toHaveBeenCalled();
    expect(notificacion.estado).toBe('enviado');
  });

  it('lista el historial de notificaciones para coordinación', async () => {
    const consulta = {
      populate: jest.fn(() => consulta),
      sort: jest.fn(() => consulta),
      limit: jest.fn().mockResolvedValue([
        { _id: 'not-1', canal: 'email', estado: 'enviado' },
      ]),
    };
    Notificacion.find.mockReturnValue(consulta);

    const respuesta = await request(app)
      .get('/api/notificaciones')
      .set('Authorization', `Bearer ${tokenPara('coordinador', 'coord-1')}`);

    expect(respuesta.statusCode).toBe(200);
    expect(respuesta.body).toHaveLength(1);
  });

  it('envía el resumen de reservas del instructor por los canales disponibles', async () => {
    const consultaBloques = {
      select: jest.fn(() => ({
        lean: jest.fn().mockResolvedValue([{ _id: 'blq-1' }]),
      })),
    };
    BloqueDisponibilidad.find.mockReturnValue(consultaBloques);
    User.findById.mockResolvedValue({
      _id: 'inst-1',
      correo: 'instructor@gym.com',
      telefono: '+573000000003',
    });
    Reserva.countDocuments.mockImplementation(async ({ estado }) => {
      if (estado === 'confirmada') return 2;
      if (estado === 'pendiente') return 1;
      return 0;
    });

    const respuesta = await request(app)
      .post('/api/notificaciones/resumen-instructor')
      .set('Authorization', `Bearer ${tokenPara('coordinador', 'coord-1')}`)
      .send({ instructorId: 'inst-1' });

    expect(respuesta.statusCode).toBe(200);
    expect(respuesta.body.resumen).toEqual({
      pendientes: 1,
      confirmadas: 2,
      canceladas: 0,
      total: 3,
    });
    expect(emailAdapter.enviar).toHaveBeenCalledTimes(1);
    expect(whatsappAdapter.enviar).toHaveBeenCalledTimes(1);
  });

  it('registra una notificación de navegación al crear un usuario', async () => {
    User.create.mockResolvedValue({
      _id: 'new-1',
      correo: 'nuevo@gym.com',
      rol: 'cliente',
      telefono: '+573000000009',
    });

    const respuesta = await request(app)
      .post('/api/usuarios')
      .set('Authorization', `Bearer ${tokenPara('administrador', 'admin-1')}`)
      .send({
        correo: 'nuevo@gym.com',
        password: 'Nuevo12345',
        rol: 'cliente',
        telefono: '+573000000009',
      });

    expect(respuesta.statusCode).toBe(201);
    expect(Notificacion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        canal: 'navegacion',
        destinatario: 'new-1',
        estado: 'enviado',
        leida: false,
      })
    );
    expect(emailAdapter.enviar).toHaveBeenCalledWith(
      expect.objectContaining({
        destino: 'nuevo@gym.com',
        asunto: 'Bienvenida a FitBook',
      })
    );
    expect(whatsappAdapter.enviar).toHaveBeenCalledWith(
      expect.objectContaining({ destino: '+573000000009' })
    );
  });

  it('registra una notificación de navegación en el registro público', async () => {
    User.create.mockResolvedValue({
      _id: 'new-2',
      correo: 'registro@gym.com',
      rol: 'cliente',
      telefono: '+573000000010',
    });

    const respuesta = await request(app).post('/api/auth/registro').send({
      correo: 'registro@gym.com',
      password: 'Registro12345',
      telefono: '+573000000010',
    });

    expect(respuesta.statusCode).toBe(201);
    expect(Notificacion.create).toHaveBeenCalledWith(
      expect.objectContaining({ canal: 'navegacion', destinatario: 'new-2' })
    );
    expect(emailAdapter.enviar).toHaveBeenCalledWith(
      expect.objectContaining({ destino: 'registro@gym.com' })
    );
    expect(whatsappAdapter.enviar).toHaveBeenCalledWith(
      expect.objectContaining({ destino: '+573000000010' })
    );
  });

  it('devuelve las notificaciones de navegación propias y permite marcarlas leídas', async () => {
    const consulta = {
      sort: jest.fn(() => consulta),
      limit: jest.fn().mockResolvedValue([
        { _id: 'not-nav-1', mensaje: 'Tu cuenta quedó creada', leida: false },
      ]),
    };
    Notificacion.find.mockReturnValue(consulta);

    const listado = await request(app)
      .get('/api/notificaciones/mias')
      .set('Authorization', `Bearer ${tokenPara('cliente', 'cli-1')}`);

    expect(listado.statusCode).toBe(200);
    expect(listado.body).toHaveLength(1);

    const notificacion = {
      _id: 'not-nav-1',
      destinatario: 'cli-1',
      leida: false,
      save: jest.fn(),
    };
    Notificacion.findById.mockResolvedValue(notificacion);

    const marcado = await request(app)
      .patch('/api/notificaciones/not-nav-1/leida')
      .set('Authorization', `Bearer ${tokenPara('cliente', 'cli-1')}`);

    expect(marcado.statusCode).toBe(200);
    expect(notificacion.leida).toBe(true);
    expect(notificacion.save).toHaveBeenCalledTimes(1);
  });

  it('notifica al cliente y a quien cancela con el motivo y el responsable', async () => {
    const reserva = reservaBase();
    Reserva.findById.mockReturnValue(consultaReserva(reserva));
    Reserva.countDocuments.mockResolvedValue(0);
    User.findById.mockResolvedValue({
      _id: 'coord-1',
      correo: 'coord@gym.com',
      rol: 'coordinador',
    });

    const respuesta = await request(app)
      .patch('/api/reservas/res-1/cancelar')
      .set('Authorization', `Bearer ${tokenPara('coordinador', 'coord-1')}`)
      .send({ motivo: 'Mantenimiento del recinto' });

    expect(respuesta.statusCode).toBe(200);
    expect(Notificacion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        canal: 'navegacion',
        destinatario: 'cli-1',
        asunto: 'Reserva cancelada',
        mensaje: expect.stringContaining('cancelada por coord@gym.com'),
      })
    );
    expect(Notificacion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        canal: 'navegacion',
        destinatario: 'coord-1',
        asunto: 'Cancelación registrada',
        mensaje: expect.stringContaining('Mantenimiento del recinto'),
      })
    );
  });

  it('notifica una sola vez cuando el cliente cancela su propia reserva', async () => {
    const reserva = reservaBase();
    Reserva.findById.mockReturnValue(consultaReserva(reserva));
    Reserva.countDocuments.mockResolvedValue(0);
    User.findById.mockResolvedValue({
      _id: 'cli-1',
      correo: 'cliente@gym.com',
      rol: 'cliente',
    });

    const respuesta = await request(app)
      .patch('/api/reservas/res-1/cancelar-propia')
      .set('Authorization', `Bearer ${tokenPara('cliente', 'cli-1')}`)
      .send({ motivo: 'Ya no puedo asistir' });

    expect(respuesta.statusCode).toBe(200);
    expect(Notificacion.create).toHaveBeenCalledTimes(1);
    expect(Notificacion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        canal: 'navegacion',
        destinatario: 'cli-1',
        mensaje: expect.stringContaining('Cancelaste tu reserva'),
      })
    );
  });

  it('marca WhatsApp como enviado cuando está activado el modo simulado', async () => {
    process.env.TWILIO_MODO_SIMULACION = 'true';
    const adaptadorReal = jest.requireActual(
      '../src/services/canales/whatsapp.adapter'
    );

    const resultado = await adaptadorReal.enviar({
      destino: '+573000000004',
      mensaje: 'Prueba de recordatorio',
    });

    expect(resultado.estado).toBe('enviado');
    expect(resultado.proveedorId).toMatch(/^simulado-/);
    delete process.env.TWILIO_MODO_SIMULACION;
  });

  it('el administrador envía la lista de confirmados por clase al instructor por correo y navegación', async () => {
    Clase.findById.mockResolvedValue({
      _id: 'cls-func',
      nombre: 'Entrenamiento Funcional',
      recinto: { _id: 'rec-1', nombre: 'Sala Funcional Principal' },
      instructor: {
        _id: 'inst-1',
        correo: 'instructor@gym.com',
        nombreUsuario: 'Carlos Coach',
        rol: 'instructor',
      },
    });

    Reserva.find.mockResolvedValue([
      {
        _id: 'res-conf-1',
        fecha: '2099-11-24',
        estado: 'confirmada',
        cliente: { _id: 'cli-1', correo: 'ana@gym.com', nombreUsuario: 'Ana' },
        bloque: { horaInicio: '16:00', horaFin: '18:00' },
      },
      {
        _id: 'res-pend-1',
        fecha: '2099-11-24',
        estado: 'pendiente',
        cliente: { _id: 'cli-2', correo: 'luis@gym.com', nombreUsuario: '' },
        bloque: { horaInicio: '16:00', horaFin: '18:00' },
      },
    ]);

    const res = await request(app)
      .post('/api/notificaciones/enviar-mensaje')
      .set('Authorization', `Bearer ${tokenPara('administrador', 'admin-1')}`)
      .send({
        claseId: 'cls-func',
        fecha: '2099-11-24',
        mensaje: 'Hola Carlos, te comparto la lista actualizada de tu clase.',
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.totalDestinatarios).toBe(1);
    expect(res.body.resumenClase.totales).toEqual({
      confirmadas: 1,
      pendientes: 1,
      canceladas: 0,
      total: 2,
    });
    expect(emailAdapter.enviar).toHaveBeenCalledWith(
      expect.objectContaining({
        destino: 'instructor@gym.com',
        asunto: expect.stringContaining('Lista de confirmados · Entrenamiento Funcional'),
        texto: expect.stringContaining('Ana (ana@gym.com)'),
      })
    );
    expect(Notificacion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        canal: 'navegacion',
        destinatario: 'inst-1',
        tipo: 'resumen_instructor',
      })
    );
  });

  it('el administrador envía un mensaje de correo a un usuario o rol y bloquea a clientes con 403', async () => {
    const resProhibido = await request(app)
      .post('/api/notificaciones/enviar-mensaje')
      .set('Authorization', `Bearer ${tokenPara('cliente', 'cli-1')}`)
      .send({ rolDestino: 'coordinador', mensaje: 'Intento no autorizado' });
    expect(resProhibido.statusCode).toBe(403);

    User.find.mockResolvedValue([
      { _id: 'coord-1', correo: 'coordinador@gym.com', rol: 'coordinador', activo: true },
    ]);

    const res = await request(app)
      .post('/api/notificaciones/enviar-mensaje')
      .set('Authorization', `Bearer ${tokenPara('administrador', 'admin-1')}`)
      .send({
        rolDestino: 'coordinador',
        asunto: 'Aviso operativo de coordinación',
        mensaje: 'Por favor revisar las reservas pendientes de hoy.',
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.totalDestinatarios).toBe(1);
    expect(emailAdapter.enviar).toHaveBeenCalledWith(
      expect.objectContaining({
        destino: 'coordinador@gym.com',
        asunto: 'Aviso operativo de coordinación',
        texto: 'Por favor revisar las reservas pendientes de hoy.',
      })
    );
  });
});
