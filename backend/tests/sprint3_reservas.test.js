process.env.JWT_SECRET = 'secreto-de-prueba-sprint3';

jest.mock('../src/models/User');
jest.mock('../src/models/Recinto');
jest.mock('../src/models/Clase');
jest.mock('../src/models/BloqueDisponibilidad');
jest.mock('../src/models/Reserva');

const request = require('supertest');
const app = require('../src/app');
const { firmarToken } = require('../src/config/jwt');
const User = require('../src/models/User');
const Recinto = require('../src/models/Recinto');
const BloqueDisponibilidad = require('../src/models/BloqueDisponibilidad');
const Reserva = require('../src/models/Reserva');

function tokenPara(rol, id = 'usr-1') {
  return firmarToken({ _id: id, rol });
}

function fechaRelativa(dias) {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + dias);
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(
    fecha.getDate()
  ).padStart(2, '0')}`;
}

function diaDeFecha(fecha) {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  return new Date(anio, mes - 1, dia, 12).getDay();
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('HU10 · Consultar disponibilidad (ST03.03)', () => {
  it('devuelve solo bloques en recintos activos con cupos libres y excluye bloques llenos o inactivos', async () => {
    // 2026-11-24 es Martes (diaSemana = 2)
    BloqueDisponibilidad.find.mockResolvedValue([
      {
        _id: 'blq-libre',
        diaSemana: 2,
        horaInicio: '16:00',
        horaFin: '18:00',
        capacidad: 5,
        recinto: { _id: 'rec-1', nombre: 'Cancha 1', activo: true },
        clase: { _id: 'cls-1', nombre: 'Funcional', activa: true },
        instructor: { _id: 'inst-1', correo: 'instructor@gym.com' },
      },
      {
        _id: 'blq-lleno',
        diaSemana: 2,
        horaInicio: '18:00',
        horaFin: '20:00',
        capacidad: 2,
        recinto: { _id: 'rec-1', nombre: 'Cancha 1', activo: true },
        clase: { _id: 'cls-1', nombre: 'Funcional', activa: true },
        instructor: { _id: 'inst-1', correo: 'instructor@gym.com' },
      },
      {
        _id: 'blq-inactivo',
        diaSemana: 2,
        horaInicio: '10:00',
        horaFin: '12:00',
        capacidad: 10,
        recinto: { _id: 'rec-2', nombre: 'Cancha 2', activo: false },
        clase: { _id: 'cls-2', nombre: 'Crossfit', activa: true },
        instructor: { _id: 'inst-1', correo: 'instructor@gym.com' },
      },
    ]);

    Reserva.countDocuments.mockImplementation(async ({ bloque }) => {
      if (bloque === 'blq-libre') return 3; // 5 - 3 = 2 libres
      if (bloque === 'blq-lleno') return 2; // 2 - 2 = 0 libres (excluido)
      return 0;
    });

    const res = await request(app)
      .get('/api/reservas/disponibilidad?fecha=2026-11-24&recinto=rec-1')
      .set('Authorization', `Bearer ${tokenPara('cliente', 'cli-1')}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].bloqueId).toBe('blq-libre');
    expect(res.body[0].cuposLibres).toBe(2);
    expect(res.body[0].cuposOcupados).toBe(3);
  });
});

describe('HU11 · Reservar un cupo y control de concurrencia (ST03.02, ST03.05)', () => {
  it('crea una reserva válida en estado pendiente con 201', async () => {
    BloqueDisponibilidad.findById.mockResolvedValue({
      _id: 'blq-1',
      diaSemana: 2, // Martes
      horaInicio: '16:00',
      horaFin: '18:00',
      capacidad: 2,
      recinto: 'rec-1',
      clase: 'cls-1',
      save: jest.fn(),
    });
    Recinto.findById.mockResolvedValue({ _id: 'rec-1', activo: true });
    Reserva.findOne.mockResolvedValue(null);
    Reserva.countDocuments.mockResolvedValue(1);
    Reserva.create.mockResolvedValue({
      _id: 'res-1',
      cliente: 'cli-1',
      bloque: 'blq-1',
      recinto: 'rec-1',
      clase: 'cls-1',
      fecha: '2026-11-24',
      estado: 'pendiente',
    });

    const res = await request(app)
      .post('/api/reservas')
      .set('Authorization', `Bearer ${tokenPara('cliente', 'cli-1')}`)
      .send({ bloqueId: 'blq-1', fecha: '2026-11-24' });

    expect(res.statusCode).toBe(201);
    expect(res.body.estado).toBe('pendiente');
    expect(res.body.cliente).toBe('cli-1');
  });

  it('rechaza duplicar una reserva activa del mismo cliente para el mismo bloque y fecha con 409', async () => {
    BloqueDisponibilidad.findById.mockResolvedValue({
      _id: 'blq-1',
      diaSemana: 2,
      capacidad: 5,
      recinto: 'rec-1',
    });
    Recinto.findById.mockResolvedValue({ _id: 'rec-1', activo: true });
    Reserva.findOne.mockResolvedValue({ _id: 'res-existente', estado: 'pendiente' });

    const res = await request(app)
      .post('/api/reservas')
      .set('Authorization', `Bearer ${tokenPara('cliente', 'cli-1')}`)
      .send({ bloqueId: 'blq-1', fecha: '2026-11-24' });

    expect(res.statusCode).toBe(409);
    expect(res.body.mensaje).toMatch(/reserva activa/i);
  });

  it('dos solicitudes simultáneas para el mismo último cupo: solo una queda guardada (ST03.05)', async () => {
    const reservasGuardadas = [];

    BloqueDisponibilidad.findById.mockResolvedValue({
      _id: 'blq-ultimo',
      diaSemana: 2,
      capacidad: 1,
      recinto: 'rec-1',
      clase: 'cls-1',
      save: jest.fn(),
    });
    Recinto.findById.mockResolvedValue({ _id: 'rec-1', activo: true });
    Reserva.findOne.mockResolvedValue(null);
    Reserva.countDocuments.mockImplementation(async () => reservasGuardadas.length);
    Reserva.create.mockImplementation(async (doc) => {
      const creada = { _id: `res-${reservasGuardadas.length + 1}`, ...doc };
      reservasGuardadas.push(creada);
      return creada;
    });

    const [resA, resB] = await Promise.all([
      request(app)
        .post('/api/reservas')
        .set('Authorization', `Bearer ${tokenPara('cliente', 'cli-A')}`)
        .send({ bloqueId: 'blq-ultimo', fecha: '2026-11-24' }),
      request(app)
        .post('/api/reservas')
        .set('Authorization', `Bearer ${tokenPara('cliente', 'cli-B')}`)
        .send({ bloqueId: 'blq-ultimo', fecha: '2026-11-24' }),
    ]);

    const codigos = [resA.statusCode, resB.statusCode].sort();
    expect(codigos).toEqual([201, 409]);
    expect(reservasGuardadas).toHaveLength(1);
  });
});

describe('HU12, HU13 y HU14 · Mis reservas, confirmar asistencia y cancelar propia (ST03.06)', () => {
  it('el cliente confirma su asistencia hasta 1 hora antes y la acción es idempotente (HU14)', async () => {
    const docReserva = {
      _id: 'res-futura',
      cliente: 'cli-1',
      bloque: { _id: 'blq-1', horaInicio: '18:00', horaFin: '20:00' },
      fecha: '2099-12-15',
      estado: 'pendiente',
      save: jest.fn().mockResolvedValue(true),
    };
    Reserva.findById.mockResolvedValue(docReserva);

    const res = await request(app)
      .patch('/api/reservas/res-futura/confirmar-asistencia')
      .set('Authorization', `Bearer ${tokenPara('cliente', 'cli-1')}`);

    expect(res.statusCode).toBe(200);
    expect(docReserva.estado).toBe('confirmada');
    expect(docReserva.fechaConfirmacion).toBeInstanceOf(Date);

    // Repetir la confirmación es idempotente
    const resRepetida = await request(app)
      .patch('/api/reservas/res-futura/confirmar-asistencia')
      .set('Authorization', `Bearer ${tokenPara('cliente', 'cli-1')}`);

    expect(resRepetida.statusCode).toBe(200);
  });

  it('impide que un cliente cancele la reserva de otro usuario devolviendo 403 (HU12, ST03.06)', async () => {
    Reserva.findById.mockResolvedValue({
      _id: 'res-ajena',
      cliente: 'cli-otro',
      bloque: { _id: 'blq-1', horaInicio: '18:00' },
      fecha: '2099-12-15',
      estado: 'pendiente',
    });

    const res = await request(app)
      .patch('/api/reservas/res-ajena/cancelar-propia')
      .set('Authorization', `Bearer ${tokenPara('cliente', 'cli-1')}`);

    expect(res.statusCode).toBe(403);
  });
});

describe('HU15, HU16, HU17, ST03.08, ST03.09 y ST03.10 · Coordinador, Instructor y Administrador', () => {
  it('el coordinador confirma y cancela reservas dejando registro de usuario, fecha y motivo (HU16, HU17, ST03.08)', async () => {
    const docReserva = {
      _id: 'res-coord',
      cliente: 'cli-1',
      bloque: 'blq-1',
      fecha: '2099-12-15',
      estado: 'pendiente',
      save: jest.fn().mockResolvedValue(true),
    };
    Reserva.findById.mockResolvedValue(docReserva);

    const resConfirm = await request(app)
      .patch('/api/reservas/res-coord/confirmar')
      .set('Authorization', `Bearer ${tokenPara('coordinador', 'coord-1')}`);

    expect(resConfirm.statusCode).toBe(200);
    expect(docReserva.estado).toBe('confirmada');
    expect(docReserva.gestionadoPor).toBe('coord-1');

    const resCancel = await request(app)
      .patch('/api/reservas/res-coord/cancelar')
      .set('Authorization', `Bearer ${tokenPara('coordinador', 'coord-1')}`)
      .send({ motivo: 'Cliente avisó inasistencia' });

    expect(resCancel.statusCode).toBe(200);
    expect(docReserva.estado).toBe('cancelada');
    expect(docReserva.motivoCancelacion).toBe('Cliente avisó inasistencia');

    // Intentar volver a cancelar una reserva ya cancelada devuelve 409 (HU17)
    const resReCancel = await request(app)
      .patch('/api/reservas/res-coord/cancelar')
      .set('Authorization', `Bearer ${tokenPara('coordinador', 'coord-1')}`);

    expect(resReCancel.statusCode).toBe(409);
  });

  it('el administrador puede reasignar una reserva y el coordinador recibe 403 (ST03.10)', async () => {
    const resCoord = await request(app)
      .patch('/api/reservas/res-1/reasignar')
      .set('Authorization', `Bearer ${tokenPara('coordinador', 'coord-1')}`)
      .send({ nuevoBloqueId: 'blq-2', nuevaFecha: '2099-12-18' });

    expect(resCoord.statusCode).toBe(403);

    const docReserva = {
      _id: 'res-1',
      cliente: 'cli-1',
      bloque: 'blq-1',
      recinto: 'rec-1',
      fecha: '2099-12-16',
      estado: 'pendiente',
      save: jest.fn().mockResolvedValue(true),
    };
    Reserva.findById.mockResolvedValue(docReserva);
    BloqueDisponibilidad.findById.mockResolvedValue({
      _id: 'blq-2',
      recinto: 'rec-2',
      clase: 'cls-2',
      capacidad: 10,
      save: jest.fn(),
    });
    Reserva.countDocuments.mockResolvedValue(2);

    const resAdmin = await request(app)
      .patch('/api/reservas/res-1/reasignar')
      .set('Authorization', `Bearer ${tokenPara('administrador', 'adm-1')}`)
      .send({ nuevoBloqueId: 'blq-2', nuevaFecha: '2099-12-18' });

    expect(resAdmin.statusCode).toBe(200);
    expect(docReserva.bloque).toBe('blq-2');
    expect(docReserva.fecha).toBe('2099-12-18');
    expect(docReserva.gestionadoPor).toBe('adm-1');
  });
});

describe('ST03.11 · Prueba E2E del flujo: reservar → confirmar → cancelar → verificar horario libre', () => {
  it('completa el ciclo E2E verificando disponibilidad antes, durante y después de cancelar', async () => {
    const estadoMemoria = [];
    const bloqueMock = {
      _id: 'blq-e2e',
      diaSemana: 2, // Martes 2099-11-24
      horaInicio: '16:00',
      horaFin: '18:00',
      capacidad: 1,
      recinto: { _id: 'rec-1', nombre: 'Cancha 1', activo: true },
      clase: { _id: 'cls-1', nombre: 'Funcional', activa: true },
      instructor: { _id: 'inst-1', correo: 'instructor@gym.com' },
      save: jest.fn(),
    };

    BloqueDisponibilidad.find.mockResolvedValue([bloqueMock]);
    BloqueDisponibilidad.findById.mockResolvedValue(bloqueMock);
    Recinto.findById.mockResolvedValue({ _id: 'rec-1', activo: true });

    Reserva.countDocuments.mockImplementation(async (filtro = {}) => {
      return estadoMemoria.filter((r) => {
        if (filtro.bloque && r.bloque !== filtro.bloque) return false;
        if (filtro.fecha && r.fecha !== filtro.fecha) return false;
        if (filtro.estado?.$in && !filtro.estado.$in.includes(r.estado)) return false;
        if (typeof filtro.estado === 'string' && r.estado !== filtro.estado) return false;
        return true;
      }).length;
    });

    Reserva.findOne.mockImplementation(async (filtro = {}) => {
      return (
        estadoMemoria.find(
          (r) =>
            r.bloque === filtro.bloque &&
            r.fecha === filtro.fecha &&
            r.cliente === filtro.cliente &&
            filtro.estado.$in.includes(r.estado)
        ) || null
      );
    });

    Reserva.create.mockImplementation(async (datos) => {
      const nueva = {
        _id: 'res-e2e-1',
        ...datos,
        save: jest.fn().mockResolvedValue(true),
      };
      estadoMemoria.push(nueva);
      return nueva;
    });

    Reserva.findById.mockImplementation(async (id) => {
      return estadoMemoria.find((r) => r._id === id) || null;
    });

    const tokenCliente = tokenPara('cliente', 'cli-e2e');
    const fechaE2E = '2099-11-24'; // Martes (diaSemana = 2)

    // 1. Verificar disponibilidad inicial (1 cupo libre)
    const dispInicial = await request(app)
      .get(`/api/reservas/disponibilidad?fecha=${fechaE2E}`)
      .set('Authorization', `Bearer ${tokenCliente}`);
    expect(dispInicial.statusCode).toBe(200);
    expect(dispInicial.body).toHaveLength(1);
    expect(dispInicial.body[0].cuposLibres).toBe(1);

    // 2. Reservar el único cupo
    const resCrear = await request(app)
      .post('/api/reservas')
      .set('Authorization', `Bearer ${tokenCliente}`)
      .send({ bloqueId: 'blq-e2e', fecha: fechaE2E });
    expect(resCrear.statusCode).toBe(201);
    expect(resCrear.body.estado).toBe('pendiente');

    // 3. Consultar disponibilidad cuando el cupo ya está reservado (0 bloques disponibles)
    const dispOcupado = await request(app)
      .get(`/api/reservas/disponibilidad?fecha=${fechaE2E}`)
      .set('Authorization', `Bearer ${tokenCliente}`);
    expect(dispOcupado.body).toHaveLength(0);

    // 4. Confirmar la reserva
    const resConfirmar = await request(app)
      .patch('/api/reservas/res-e2e-1/confirmar-asistencia')
      .set('Authorization', `Bearer ${tokenCliente}`);
    expect(resConfirmar.statusCode).toBe(200);
    expect(resConfirmar.body.estado).toBe('confirmada');

    // 5. Cancelar la reserva propia
    const resCancelar = await request(app)
      .patch('/api/reservas/res-e2e-1/cancelar-propia')
      .set('Authorization', `Bearer ${tokenCliente}`);
    expect(resCancelar.statusCode).toBe(200);
    expect(resCancelar.body.estado).toBe('cancelada');

    // 6. Verificar que el horario vuelve a aparecer libre en disponibilidad y el historial se conserva
    const dispFinal = await request(app)
      .get(`/api/reservas/disponibilidad?fecha=${fechaE2E}`)
      .set('Authorization', `Bearer ${tokenCliente}`);
    expect(dispFinal.statusCode).toBe(200);
    expect(dispFinal.body).toHaveLength(1);
    expect(dispFinal.body[0].cuposLibres).toBe(1);
    expect(estadoMemoria[0].estado).toBe('cancelada');
  });
});

describe('P0 · Validaciones de fecha y reasignación', () => {
  it('rechaza fechas pasadas e imposibles en disponibilidad y creación', async () => {
    const token = `Bearer ${tokenPara('cliente', 'cli-fechas')}`;

    const pasada = await request(app)
      .get('/api/reservas/disponibilidad?fecha=2020-01-01')
      .set('Authorization', token);
    expect(pasada.statusCode).toBe(400);

    const imposible = await request(app)
      .post('/api/reservas')
      .set('Authorization', token)
      .send({ bloqueId: 'blq-1', fecha: '2026-13-45' });
    expect(imposible.statusCode).toBe(400);
  });

  it('rechaza reasignar a una fecha pasada', async () => {
    Reserva.findById.mockResolvedValue({
      _id: 'res-pasada',
      cliente: 'cli-1',
      bloque: 'blq-1',
      recinto: 'rec-1',
      fecha: '2099-12-16',
      estado: 'pendiente',
      save: jest.fn(),
    });

    const res = await request(app)
      .patch('/api/reservas/res-pasada/reasignar')
      .set('Authorization', `Bearer ${tokenPara('administrador', 'adm-1')}`)
      .send({ nuevoBloqueId: 'blq-2', nuevaFecha: fechaRelativa(-2) });

    expect(res.statusCode).toBe(400);
    expect(res.body.mensaje).toMatch(/futura/i);
  });

  it('rechaza reasignar a un cliente que no existe', async () => {
    const fecha = fechaRelativa(3);
    Reserva.findById.mockResolvedValue({
      _id: 'res-cliente',
      cliente: 'cli-1',
      bloque: 'blq-1',
      recinto: 'rec-1',
      fecha: '2099-12-16',
      estado: 'pendiente',
      save: jest.fn(),
    });
    BloqueDisponibilidad.findById.mockResolvedValue({
      _id: 'blq-2',
      recinto: 'rec-2',
      clase: 'cls-2',
      diaSemana: diaDeFecha(fecha),
      capacidad: 5,
      save: jest.fn(),
    });
    Recinto.findById.mockResolvedValue({ _id: 'rec-2', activo: true });
    Reserva.countDocuments.mockResolvedValue(0);
    Reserva.findOne.mockResolvedValue(null);

    const res = await request(app)
      .patch('/api/reservas/res-cliente/reasignar')
      .set('Authorization', `Bearer ${tokenPara('administrador', 'adm-1')}`)
      .send({ nuevoBloqueId: 'blq-2', nuevaFecha: fecha, nuevoClienteId: 'usr-inexistente' });

    expect(res.statusCode).toBe(404);
    expect(res.body.mensaje).toMatch(/cliente de destino/i);
  });

  it('reasigna solo el cliente aunque la fecha legacy no coincida con el día del bloque', async () => {
    Reserva.findById.mockResolvedValue({
      _id: 'res-legacy',
      cliente: 'cli-1',
      bloque: 'blq-legacy',
      recinto: 'rec-1',
      fecha: '2026-11-24',
      estado: 'pendiente',
      save: jest.fn(),
    });
    BloqueDisponibilidad.findById.mockResolvedValue({
      _id: 'blq-legacy',
      diaSemana: 4,
      capacidad: 5,
      recinto: 'rec-1',
      save: jest.fn(),
    });
    Recinto.findById.mockResolvedValue({ _id: 'rec-1', activo: true });
    Reserva.countDocuments.mockResolvedValue(1);
    Reserva.findOne.mockResolvedValue(null);
    User.findById.mockResolvedValue({ _id: 'cli-2', activo: true });

    const res = await request(app)
      .patch('/api/reservas/res-legacy/reasignar')
      .set('Authorization', `Bearer ${tokenPara('administrador', 'adm-1')}`)
      .send({
        nuevoBloqueId: 'blq-legacy',
        nuevaFecha: '2026-11-24',
        nuevoClienteId: 'cli-2',
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.cliente).toBe('cli-2');
    expect(res.body.fecha).toBe('2026-11-24');
  });

  it('la confirmación del coordinador es idempotente', async () => {
    Reserva.findById.mockResolvedValue({
      _id: 'res-confirmada',
      cliente: 'cli-1',
      bloque: 'blq-1',
      recinto: 'rec-1',
      fecha: '2099-12-16',
      estado: 'confirmada',
      save: jest.fn(),
    });

    const res = await request(app)
      .patch('/api/reservas/res-confirmada/confirmar')
      .set('Authorization', `Bearer ${tokenPara('coordinador', 'coord-1')}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.estado).toBe('confirmada');
  });
});

describe('P0 · RBAC sobre rutas reales de reservas', () => {
  it('un cliente no puede consultar el listado global', async () => {
    const res = await request(app)
      .get('/api/reservas')
      .set('Authorization', `Bearer ${tokenPara('cliente', 'cli-rbac')}`);
    expect(res.statusCode).toBe(403);
  });

  it('un coordinador no puede crear reservas', async () => {
    const res = await request(app)
      .post('/api/reservas')
      .set('Authorization', `Bearer ${tokenPara('coordinador', 'coord-rbac')}`)
      .send({ bloqueId: 'blq-1', fecha: fechaRelativa(2) });
    expect(res.statusCode).toBe(403);
  });

  it('un instructor no puede consultar /mias', async () => {
    const res = await request(app)
      .get('/api/reservas/mias')
      .set('Authorization', `Bearer ${tokenPara('instructor', 'inst-rbac')}`);
    expect(res.statusCode).toBe(403);
  });
});
