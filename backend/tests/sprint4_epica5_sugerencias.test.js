process.env.JWT_SECRET = 'secreto-de-prueba-epica5';

jest.mock('../src/models/User');
jest.mock('../src/models/Recinto');
jest.mock('../src/models/Clase');
jest.mock('../src/models/BloqueDisponibilidad');
jest.mock('../src/models/Reserva');
jest.mock('../src/models/Sugerencia');

const request = require('supertest');
const app = require('../src/app');
const { firmarToken } = require('../src/config/jwt');
const Recinto = require('../src/models/Recinto');
const Clase = require('../src/models/Clase');
const Sugerencia = require('../src/models/Sugerencia');

function tokenPara(rol, id = 'usr-1') {
  return firmarToken({ _id: id, rol });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('HU05 · Épica 5 · Quejas, sugerencias e indicadores (ST05.01 – ST05.07)', () => {
  it('permite al cliente enviar una sugerencia válida con estado nueva (201) (ST05.02, ST05.03, ST05.07)', async () => {
    Recinto.findById.mockResolvedValue({ _id: 'rec-1', nombre: 'Cancha 1', activo: true });
    Clase.findById.mockResolvedValue({ _id: 'cls-1', nombre: 'Funcional' });
    Sugerencia.create.mockResolvedValue({
      _id: 'sug-1',
      usuario: 'cli-1',
      recinto: 'rec-1',
      clase: 'cls-1',
      categoria: 'instalaciones',
      texto: 'Excelente iluminación en la cancha techada.',
      estado: 'nueva',
    });

    const res = await request(app)
      .post('/api/sugerencias')
      .set('Authorization', `Bearer ${tokenPara('cliente', 'cli-1')}`)
      .send({
        recinto: 'rec-1',
        clase: 'cls-1',
        categoria: 'instalaciones',
        texto: 'Excelente iluminación en la cancha techada.',
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.estado).toBe('nueva');
    expect(res.body.categoria).toBe('instalaciones');
  });

  it('rechaza con 400 un envío con texto vacío o que supera los 500 caracteres (ST05.03, ST05.07)', async () => {
    const resVacio = await request(app)
      .post('/api/sugerencias')
      .set('Authorization', `Bearer ${tokenPara('cliente', 'cli-1')}`)
      .send({
        recinto: 'rec-1',
        categoria: 'limpieza',
        texto: '   ',
      });

    expect(resVacio.statusCode).toBe(400);
    expect(resVacio.body.mensaje).toMatch(/no puede estar vacío/i);
    expect(Sugerencia.create).not.toHaveBeenCalled();

    const textoExcesivo = 'A'.repeat(501);
    const resLargo = await request(app)
      .post('/api/sugerencias')
      .set('Authorization', `Bearer ${tokenPara('cliente', 'cli-1')}`)
      .send({
        recinto: 'rec-1',
        categoria: 'limpieza',
        texto: textoExcesivo,
      });

    expect(resLargo.statusCode).toBe(400);
    expect(resLargo.body.mensaje).toMatch(/500 caracteres/i);
    expect(Sugerencia.create).not.toHaveBeenCalled();
  });

  it('el coordinador lista sugerencias con filtros y las marca como revisadas (ST05.04)', async () => {
    Sugerencia.find.mockResolvedValue([
      {
        _id: 'sug-1',
        usuario: { _id: 'cli-1', correo: 'cliente@gym.com' },
        recinto: { _id: 'rec-1', nombre: 'Cancha 1' },
        categoria: 'limpieza',
        texto: 'Falta jabón en los vestidores.',
        estado: 'nueva',
        createdAt: new Date('2026-11-20T10:00:00Z'),
      },
    ]);

    const resLista = await request(app)
      .get('/api/sugerencias?recinto=rec-1&categoria=limpieza&estado=nueva')
      .set('Authorization', `Bearer ${tokenPara('coordinador', 'coord-1')}`);

    expect(resLista.statusCode).toBe(200);
    expect(resLista.body).toHaveLength(1);
    expect(Sugerencia.find).toHaveBeenCalledWith({
      recinto: 'rec-1',
      categoria: 'limpieza',
      estado: 'nueva',
    });

    const docSugerencia = {
      _id: 'sug-1',
      estado: 'nueva',
      revisadoPor: null,
      fechaRevision: null,
      save: jest.fn().mockResolvedValue(true),
    };
    Sugerencia.findById.mockResolvedValue(docSugerencia);

    const resRevisar = await request(app)
      .patch('/api/sugerencias/sug-1/estado')
      .set('Authorization', `Bearer ${tokenPara('coordinador', 'coord-1')}`)
      .send({ estado: 'revisada' });

    expect(resRevisar.statusCode).toBe(200);
    expect(docSugerencia.estado).toBe('revisada');
    expect(docSugerencia.revisadoPor).toBe('coord-1');
    expect(docSugerencia.fechaRevision).toBeInstanceOf(Date);
  });

  it('calcula correctamente los indicadores por recinto, clase y categoría para el administrador y bloquea otros roles con 403 (ST05.05, ST05.07)', async () => {
    // Coordinador o cliente reciben 403 en /api/sugerencias/indicadores
    const resCoord = await request(app)
      .get('/api/sugerencias/indicadores')
      .set('Authorization', `Bearer ${tokenPara('coordinador', 'coord-1')}`);
    expect(resCoord.statusCode).toBe(403);

    Sugerencia.find.mockResolvedValue([
      {
        _id: 's1',
        recinto: { _id: 'rec-1', nombre: 'Cancha 1' },
        clase: { _id: 'cls-1', nombre: 'Funcional' },
        categoria: 'instalaciones',
        estado: 'revisada',
      },
      {
        _id: 's2',
        recinto: { _id: 'rec-1', nombre: 'Cancha 1' },
        clase: { _id: 'cls-1', nombre: 'Funcional' },
        categoria: 'limpieza',
        estado: 'nueva',
      },
      {
        _id: 's3',
        recinto: { _id: 'rec-2', nombre: 'Sala Spinning' },
        clase: null,
        categoria: 'instalaciones',
        estado: 'revisada',
      },
    ]);

    const resInd = await request(app)
      .get('/api/sugerencias/indicadores?desde=2026-11-01&hasta=2026-11-30')
      .set('Authorization', `Bearer ${tokenPara('administrador', 'adm-1')}`);

    expect(resInd.statusCode).toBe(200);
    expect(resInd.body.resumen).toEqual({
      total: 3,
      nuevas: 1,
      revisadas: 2,
      porcentajeRevisadas: 67,
    });

    const cancha1 = resInd.body.porRecinto.find((r) => r.recintoId === 'rec-1');
    expect(cancha1).toEqual({
      recintoId: 'rec-1',
      nombre: 'Cancha 1',
      total: 2,
      nuevas: 1,
      revisadas: 1,
    });

    const claseFuncional = resInd.body.porClase.find((c) => c.claseId === 'cls-1');
    expect(claseFuncional).toEqual({
      claseId: 'cls-1',
      nombre: 'Funcional',
      total: 2,
      nuevas: 1,
      revisadas: 1,
    });

    const catInstalaciones = resInd.body.porCategoria.find(
      (c) => c.categoria === 'instalaciones'
    );
    expect(catInstalaciones.total).toBe(2);
    expect(catInstalaciones.revisadas).toBe(2);
  });

  it('el cliente consulta su propio historial de sugerencias en /api/sugerencias/mias ordenado por fecha', async () => {
    Sugerencia.find.mockResolvedValue([
      {
        _id: 'sug-vieja',
        usuario: 'cli-1',
        categoria: 'horarios',
        texto: 'Ampliar horario de los sábados.',
        estado: 'revisada',
        createdAt: new Date('2026-11-10T10:00:00Z'),
      },
      {
        _id: 'sug-reciente',
        usuario: 'cli-1',
        categoria: 'instructor',
        texto: 'Muy buena clase de spinning.',
        estado: 'nueva',
        createdAt: new Date('2026-11-24T15:00:00Z'),
      },
    ]);

    const res = await request(app)
      .get('/api/sugerencias/mias')
      .set('Authorization', `Bearer ${tokenPara('cliente', 'cli-1')}`);

    expect(res.statusCode).toBe(200);
    expect(Sugerencia.find).toHaveBeenCalledWith({ usuario: 'cli-1' });
    expect(res.body.map((s) => s._id)).toEqual(['sug-reciente', 'sug-vieja']);
  });

  it('valida categoría, existencia de recinto/clase y estado en actualización (400 / 404)', async () => {
    const tokenCli = `Bearer ${tokenPara('cliente', 'cli-1')}`;

    const resSinRecinto = await request(app)
      .post('/api/sugerencias')
      .set('Authorization', tokenCli)
      .send({ categoria: 'limpieza', texto: 'Falta papel en baños' });
    expect(resSinRecinto.statusCode).toBe(400);

    const resCatInvalida = await request(app)
      .post('/api/sugerencias')
      .set('Authorization', tokenCli)
      .send({ recinto: 'rec-1', categoria: 'inexistente', texto: 'Texto válido' });
    expect(resCatInvalida.statusCode).toBe(400);

    Recinto.findById.mockResolvedValueOnce(null);
    const resRecinto404 = await request(app)
      .post('/api/sugerencias')
      .set('Authorization', tokenCli)
      .send({ recinto: 'rec-no-existe', categoria: 'limpieza', texto: 'Texto válido' });
    expect(resRecinto404.statusCode).toBe(404);

    Recinto.findById.mockResolvedValueOnce({ _id: 'rec-1', nombre: 'Cancha 1' });
    Clase.findById.mockResolvedValueOnce(null);
    const resClase404 = await request(app)
      .post('/api/sugerencias')
      .set('Authorization', tokenCli)
      .send({
        recinto: 'rec-1',
        clase: 'cls-no-existe',
        categoria: 'instructor',
        texto: 'Texto válido',
      });
    expect(resClase404.statusCode).toBe(404);

    const tokenCoord = `Bearer ${tokenPara('coordinador', 'coord-1')}`;
    const resEstadoInvalido = await request(app)
      .patch('/api/sugerencias/sug-1/estado')
      .set('Authorization', tokenCoord)
      .send({ estado: 'archivada' });
    expect(resEstadoInvalido.statusCode).toBe(400);

    Sugerencia.findById.mockResolvedValueOnce(null);
    const resSugerencia404 = await request(app)
      .patch('/api/sugerencias/sug-no-existe/estado')
      .set('Authorization', tokenCoord)
      .send({ estado: 'revisada' });
    expect(resSugerencia404.statusCode).toBe(404);
  });

  it('aplica RBAC: solo clientes crean sugerencias y solo coordinador/admin las listan o revisan', async () => {
    const resCoordCrear = await request(app)
      .post('/api/sugerencias')
      .set('Authorization', `Bearer ${tokenPara('coordinador', 'coord-1')}`)
      .send({ recinto: 'rec-1', categoria: 'limpieza', texto: 'Intento coordinador' });
    expect(resCoordCrear.statusCode).toBe(403);

    const resCliListarGlobal = await request(app)
      .get('/api/sugerencias')
      .set('Authorization', `Bearer ${tokenPara('cliente', 'cli-1')}`);
    expect(resCliListarGlobal.statusCode).toBe(403);

    const resInstRevisar = await request(app)
      .patch('/api/sugerencias/sug-1/estado')
      .set('Authorization', `Bearer ${tokenPara('instructor', 'inst-1')}`)
      .send({ estado: 'revisada' });
    expect(resInstRevisar.statusCode).toBe(403);
  });
});
