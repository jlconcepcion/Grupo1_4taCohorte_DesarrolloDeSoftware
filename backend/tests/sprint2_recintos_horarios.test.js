process.env.JWT_SECRET = 'secreto-de-prueba-sprint2';

jest.mock('../src/models/User');
jest.mock('../src/models/Recinto');
jest.mock('../src/models/Clase');
jest.mock('../src/models/BloqueDisponibilidad');
jest.mock('../src/models/Reserva');

const request = require('supertest');
const app = require('../src/app');
const { firmarToken } = require('../src/config/jwt');
const Recinto = require('../src/models/Recinto');
const Clase = require('../src/models/Clase');
const BloqueDisponibilidad = require('../src/models/BloqueDisponibilidad');
const Reserva = require('../src/models/Reserva');

function tokenPara(rol, id = 'usr-1') {
  return firmarToken({ _id: id, rol });
}

beforeEach(() => {
  jest.clearAllMocks();
  Reserva.countDocuments = jest.fn().mockResolvedValue(0);
});

describe('HU04 y HU05 · Gestión de Recintos (ST02.02, ST02.11)', () => {
  it('el administrador crea un recinto activo con 201 (HU04)', async () => {
    const mockRecinto = {
      _id: 'rec-1',
      nombre: 'Cancha 1',
      tipo: 'Fútbol 5',
      capacidad: 10,
      activo: true,
    };
    Recinto.create.mockResolvedValue(mockRecinto);

    const res = await request(app)
      .post('/api/recintos')
      .set('Authorization', `Bearer ${tokenPara('administrador')}`)
      .send({ nombre: 'Cancha 1', tipo: 'Fútbol 5', capacidad: 10 });

    expect(res.statusCode).toBe(201);
    expect(res.body.nombre).toBe('Cancha 1');
    expect(res.body.activo).toBe(true);
  });

  it('rechaza crear un recinto con nombre repetido devolviendo 409 (HU04)', async () => {
    Recinto.create.mockRejectedValue({ code: 11000 });

    const res = await request(app)
      .post('/api/recintos')
      .set('Authorization', `Bearer ${tokenPara('administrador')}`)
      .send({ nombre: 'Cancha 1', tipo: 'Fútbol 5', capacidad: 10 });

    expect(res.statusCode).toBe(409);
  });

  it('rechaza crear recinto sin nombre, tipo o con capacidad <= 0 devolviendo 400 (HU04)', async () => {
    const res = await request(app)
      .post('/api/recintos')
      .set('Authorization', `Bearer ${tokenPara('administrador')}`)
      .send({ nombre: '', tipo: '', capacidad: 0 });

    expect(res.statusCode).toBe(400);
    expect(res.body.errores).toHaveLength(3);
  });

  it('un rol distinto de administrador recibe 403 al crear o editar recintos (HU04, HU05)', async () => {
    for (const rol of ['cliente', 'instructor', 'coordinador']) {
      const res = await request(app)
        .post('/api/recintos')
        .set('Authorization', `Bearer ${tokenPara(rol)}`)
        .send({ nombre: 'Cancha X', tipo: 'Tenis', capacidad: 4 });
      expect(res.statusCode).toBe(403);
    }
  });

  it('el administrador actualiza y desactiva un recinto; las consultas de cliente solo ven activos (HU05)', async () => {
    const docRecinto = {
      _id: 'rec-2',
      nombre: 'Cancha 2',
      tipo: 'Fútbol 5',
      capacidad: 10,
      activo: true,
      save: jest.fn().mockResolvedValue(true),
    };
    Recinto.findById.mockResolvedValue(docRecinto);

    const resUpdate = await request(app)
      .put('/api/recintos/rec-2')
      .set('Authorization', `Bearer ${tokenPara('administrador')}`)
      .send({ activo: false, capacidad: 12 });

    expect(resUpdate.statusCode).toBe(200);
    expect(docRecinto.activo).toBe(false);
    expect(docRecinto.capacidad).toBe(12);
    expect(docRecinto.save).toHaveBeenCalled();

    // Consulta como cliente filtra { activo: true }
    Recinto.find.mockReturnValue({
      sort: jest.fn().mockResolvedValue([{ _id: 'rec-1', nombre: 'Cancha 1', activo: true }]),
    });

    const resCliente = await request(app)
      .get('/api/recintos')
      .set('Authorization', `Bearer ${tokenPara('cliente')}`);

    expect(resCliente.statusCode).toBe(200);
    expect(Recinto.find).toHaveBeenCalledWith({ activo: true });
  });
});

describe('HU06 · Crear y Actualizar Clases del Instructor (ST02.04)', () => {
  it('el instructor crea una clase en un recinto activo con 201', async () => {
    Recinto.findById.mockResolvedValue({ _id: 'rec-1', nombre: 'Cancha 1', activo: true });
    Clase.create.mockResolvedValue({
      _id: 'cls-1',
      nombre: 'Entrenamiento funcional',
      tipoRutina: 'Fuerza',
      recinto: 'rec-1',
      instructor: 'inst-1',
      activa: true,
    });

    const res = await request(app)
      .post('/api/clases')
      .set('Authorization', `Bearer ${tokenPara('instructor', 'inst-1')}`)
      .send({
        nombre: 'Entrenamiento funcional',
        tipoRutina: 'Fuerza',
        recinto: 'rec-1',
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.instructor).toBe('inst-1');
  });

  it('rechaza asignar una clase a un recinto inactivo devolviendo 400 (HU05, HU06, ST02.04)', async () => {
    Recinto.findById.mockResolvedValue({ _id: 'rec-2', nombre: 'Cancha 2', activo: false });

    const res = await request(app)
      .post('/api/clases')
      .set('Authorization', `Bearer ${tokenPara('instructor', 'inst-1')}`)
      .send({
        nombre: 'Crossfit',
        tipoRutina: 'Alta intensidad',
        recinto: 'rec-2',
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.mensaje).toMatch(/recinto inactivo/i);
    expect(Clase.create).not.toHaveBeenCalled();
  });

  it('impide que un instructor modifique la clase de otro instructor con 403 (HU06)', async () => {
    Clase.findById.mockResolvedValue({
      _id: 'cls-ajena',
      nombre: 'Spinning',
      tipoRutina: 'Cardio',
      instructor: 'inst-otro',
      recinto: 'rec-1',
    });

    const res = await request(app)
      .put('/api/clases/cls-ajena')
      .set('Authorization', `Bearer ${tokenPara('instructor', 'inst-1')}`)
      .send({ nombre: 'Intento cambio' });

    expect(res.statusCode).toBe(403);
  });
});

describe('HU07, HU08 y HU09 · Bloques de Disponibilidad, Solapamientos y Reservas Activas (ST02.05–ST02.11)', () => {
  it('registra un bloque válido cuando no hay solapamiento (HU07, ST02.05, ST02.11)', async () => {
    Recinto.findById.mockResolvedValue({ _id: 'rec-1', activo: true });
    Clase.findById.mockResolvedValue({ _id: 'cls-1', instructor: 'inst-1' });
    BloqueDisponibilidad.find.mockResolvedValue([
      { _id: 'blq-prev', diaSemana: 2, horaInicio: '14:00', horaFin: '16:00' },
    ]);
    BloqueDisponibilidad.create.mockResolvedValue({
      _id: 'blq-nuevo',
      clase: 'cls-1',
      instructor: 'inst-1',
      recinto: 'rec-1',
      diaSemana: 2,
      horaInicio: '16:00',
      horaFin: '18:00',
      capacidad: 12,
    });

    const res = await request(app)
      .post('/api/bloques')
      .set('Authorization', `Bearer ${tokenPara('instructor', 'inst-1')}`)
      .send({
        clase: 'cls-1',
        recinto: 'rec-1',
        diaSemana: 2,
        horaInicio: '16:00',
        horaFin: '18:00',
        capacidad: 12,
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.horaInicio).toBe('16:00');
  });

  it('rechaza un bloque con horaFin <= horaInicio con 400 (HU07, ST02.05)', async () => {
    const res = await request(app)
      .post('/api/bloques')
      .set('Authorization', `Bearer ${tokenPara('instructor', 'inst-1')}`)
      .send({
        clase: 'cls-1',
        recinto: 'rec-1',
        diaSemana: 2,
        horaInicio: '18:00',
        horaFin: '16:00',
        capacidad: 10,
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.mensaje).toMatch(/posterior a la hora de inicio/i);
  });

  it('rechaza un bloque solapado (17:00-19:00 cuando existe 16:00-18:00 el mismo día) con 409 (HU07, ST02.06, ST02.11)', async () => {
    Recinto.findById.mockResolvedValue({ _id: 'rec-1', activo: true });
    Clase.findById.mockResolvedValue({ _id: 'cls-1', instructor: 'inst-1' });
    BloqueDisponibilidad.find.mockResolvedValue([
      { _id: 'blq-1', diaSemana: 2, horaInicio: '16:00', horaFin: '18:00' },
    ]);

    const res = await request(app)
      .post('/api/bloques')
      .set('Authorization', `Bearer ${tokenPara('instructor', 'inst-1')}`)
      .send({
        clase: 'cls-1',
        recinto: 'rec-1',
        diaSemana: 2,
        horaInicio: '17:00',
        horaFin: '19:00',
        capacidad: 10,
      });

    expect(res.statusCode).toBe(409);
    expect(res.body.mensaje).toMatch(/se solapa/i);
    expect(BloqueDisponibilidad.create).not.toHaveBeenCalled();
  });

  it('impide reducir la capacidad por debajo de las reservas activas en HU08 y HU09', async () => {
    const bloqueExistente = {
      _id: 'blq-1',
      instructor: 'inst-1',
      recinto: 'rec-1',
      diaSemana: 2,
      horaInicio: '16:00',
      horaFin: '18:00',
      capacidad: 10,
      reservasActivas: 6,
      save: jest.fn(),
    };
    BloqueDisponibilidad.findById.mockResolvedValue(bloqueExistente);
    Reserva.countDocuments.mockResolvedValue(6);

    const res = await request(app)
      .put('/api/bloques/blq-1')
      .set('Authorization', `Bearer ${tokenPara('instructor', 'inst-1')}`)
      .send({ capacidad: 4 });

    expect(res.statusCode).toBe(409);
    expect(res.body.mensaje).toMatch(/por debajo de las reservas activas/i);
    expect(bloqueExistente.save).not.toHaveBeenCalled();
  });

  it('el coordinador puede editar el bloque de cualquier instructor y registra usuario y fecha (HU09, ST02.09)', async () => {
    const bloqueDeJuan = {
      _id: 'blq-juan',
      instructor: 'inst-juan',
      recinto: 'rec-1',
      diaSemana: 2,
      horaInicio: '16:00',
      horaFin: '18:00',
      capacidad: 10,
      reservasActivas: 0,
      modificadoPor: null,
      fechaModificacion: null,
      historialCambios: [],
      save: jest.fn().mockResolvedValue(true),
    };
    BloqueDisponibilidad.findById.mockResolvedValue(bloqueDeJuan);
    BloqueDisponibilidad.find.mockResolvedValue([]);

    const res = await request(app)
      .put('/api/bloques/blq-juan')
      .set('Authorization', `Bearer ${tokenPara('coordinador', 'coord-99')}`)
      .send({ horaInicio: '17:00', horaFin: '19:00' });

    expect(res.statusCode).toBe(200);
    expect(bloqueDeJuan.horaInicio).toBe('17:00');
    expect(bloqueDeJuan.horaFin).toBe('19:00');
    expect(bloqueDeJuan.modificadoPor).toBe('coord-99');
    expect(bloqueDeJuan.fechaModificacion).toBeInstanceOf(Date);
    expect(bloqueDeJuan.historialCambios).toHaveLength(1);
    expect(bloqueDeJuan.historialCambios[0].usuario).toBe('coord-99');
  });

  it('bloquea la eliminación de un bloque con reservas activas y no borra nada (ST02.07, HU09, ST02.11)', async () => {
    const deleteOneMock = jest.fn();
    BloqueDisponibilidad.findById.mockResolvedValue({
      _id: 'blq-ocupado',
      instructor: 'inst-1',
      reservasActivas: 2,
      deleteOne: deleteOneMock,
    });
    Reserva.countDocuments.mockResolvedValue(2);

    const res = await request(app)
      .delete('/api/bloques/blq-ocupado')
      .set('Authorization', `Bearer ${tokenPara('instructor', 'inst-1')}`);

    expect(res.statusCode).toBe(409);
    expect(res.body.mensaje).toMatch(/reservas activas/i);
    expect(deleteOneMock).not.toHaveBeenCalled();
  });
});

