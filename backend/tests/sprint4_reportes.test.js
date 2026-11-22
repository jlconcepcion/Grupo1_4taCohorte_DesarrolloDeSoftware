process.env.JWT_SECRET = 'secreto-de-prueba-sprint4-reportes';

jest.mock('../src/models/User');
jest.mock('../src/models/Recinto');
jest.mock('../src/models/Clase');
jest.mock('../src/models/BloqueDisponibilidad');
jest.mock('../src/models/Reserva');

const request = require('supertest');
const app = require('../src/app');
const { firmarToken } = require('../src/config/jwt');
const Reserva = require('../src/models/Reserva');

function tokenPara(rol) {
  return firmarToken({ _id: `${rol}-1`, rol });
}

beforeEach(() => {
  jest.resetAllMocks();
});

describe('HU15 · Reporte CSV de reservas (ST04.08)', () => {
  it('descarga un CSV con las reservas filtradas por estado', async () => {
    const consulta = {
      populate: jest.fn().mockResolvedValue([
        {
          _id: 'res-1',
          fecha: '2026-11-24',
          estado: 'confirmada',
          fechaConfirmacion: new Date('2026-11-23T10:00:00.000Z'),
          cliente: { correo: 'cliente@gym.com' },
          recinto: { nombre: 'Cancha 1' },
          clase: { nombre: 'Funcional', instructor: { correo: 'instructor@gym.com' } },
          bloque: { horaInicio: '16:00', horaFin: '18:00' },
        },
      ]),
    };
    Reserva.find.mockReturnValue(consulta);

    const respuesta = await request(app)
      .get('/api/reportes/reservas.csv?estado=confirmada')
      .set('Authorization', `Bearer ${tokenPara('administrador')}`);

    expect(Reserva.find).toHaveBeenCalledWith({ estado: 'confirmada' });
    expect(respuesta.statusCode).toBe(200);
    expect(respuesta.headers['content-type']).toMatch(/text\/csv/);
    expect(respuesta.text).toContain('"fecha","horaInicio"');
    expect(respuesta.text).toContain('"cliente@gym.com"');
    expect(respuesta.text).toContain('"Cancha 1"');
  });

  it('rechaza un estado inválido antes de generar el CSV', async () => {
    const respuesta = await request(app)
      .get('/api/reportes/reservas.csv?estado=invalido')
      .set('Authorization', `Bearer ${tokenPara('coordinador')}`);

    expect(respuesta.statusCode).toBe(400);
    expect(Reserva.find).not.toHaveBeenCalled();
  });

  it('impide que un cliente descargue el reporte', async () => {
    const respuesta = await request(app)
      .get('/api/reportes/reservas.csv')
      .set('Authorization', `Bearer ${tokenPara('cliente')}`);

    expect(respuesta.statusCode).toBe(403);
  });
});
