process.env.JWT_SECRET = 'secreto-de-prueba-preferencias';

jest.mock('../src/models/User');
jest.mock('../src/models/Reserva');
jest.mock('../src/models/Notificacion');
jest.mock('../src/models/BloqueDisponibilidad');
jest.mock('../src/services/canales/email.adapter');
jest.mock('../src/services/canales/whatsapp.adapter');

const request = require('supertest');
const app = require('../src/app');
const { firmarToken } = require('../src/config/jwt');
const User = require('../src/models/User');
const Notificacion = require('../src/models/Notificacion');
const emailAdapter = require('../src/services/canales/email.adapter');
const whatsappAdapter = require('../src/services/canales/whatsapp.adapter');
const {
  enviarRecordatorio,
  generarTokenAsistencia,
  verificarTokenAsistencia,
  minutosAnticipacionReserva,
  ttlTokenRecordatorio,
} = require('../src/services/notificaciones.service');

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

function reservaConPreferencias(preferenciasRecordatorio) {
  return {
    _id: 'res-pref-1',
    estado: 'pendiente',
    fecha: fechaRelativa(1),
    cliente: {
      _id: 'cli-pref-1',
      correo: 'cliente-pref@gym.com',
      telefono: '+573000000077',
      preferenciasRecordatorio,
    },
    clase: { _id: 'cls-1', nombre: 'Funcional' },
    recinto: { _id: 'rec-1', nombre: 'Cancha 1' },
    bloque: { _id: 'blq-1', horaInicio: '23:59' },
    save: jest.fn(),
  };
}

beforeEach(() => {
  jest.resetAllMocks();
  Notificacion.create.mockResolvedValue({});
  Notificacion.findOne.mockResolvedValue(null);
  emailAdapter.enviar.mockResolvedValue({ estado: 'enviado', proveedorId: 'smtp-pref' });
  whatsappAdapter.enviar.mockResolvedValue({ estado: 'enviado', proveedorId: 'tw-pref' });
});

describe('ST04.15 · Preferencias del recordatorio por usuario', () => {
  it('envía solo por navegación cuando el cliente desactiva correo y WhatsApp', async () => {
    const reserva = reservaConPreferencias({
      activo: true,
      canales: ['navegacion'],
      minutosAnticipacion: 30,
    });

    const resultado = await enviarRecordatorio(reserva);

    expect(emailAdapter.enviar).not.toHaveBeenCalled();
    expect(whatsappAdapter.enviar).not.toHaveBeenCalled();
    expect(Notificacion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        canal: 'navegacion',
        tipo: 'recordatorio',
        estado: 'enviado',
        destinatario: 'cli-pref-1',
        mensaje: expect.stringContaining('Confirma tu asistencia'),
      })
    );
    expect(resultado.resultados).toHaveLength(1);
    expect(reserva.recordatorioEnviado).toBe(true);
  });

  it('usa la anticipación del usuario para la ventana y el TTL del token', () => {
    const reserva = reservaConPreferencias({
      activo: true,
      canales: ['email'],
      minutosAnticipacion: 1440,
    });

    expect(minutosAnticipacionReserva(reserva)).toBe(1440);
    const token = generarTokenAsistencia(reserva, {
      expiresIn: ttlTokenRecordatorio(minutosAnticipacionReserva(reserva)),
    });
    const payload = verificarTokenAsistencia(token);
    expect(payload.exp - payload.iat).toBeGreaterThanOrEqual(24 * 60 * 60);
  });

  it('omite y marca como procesado cuando el cliente desactiva todos los recordatorios', async () => {
    const reserva = reservaConPreferencias({
      activo: false,
      canales: ['email', 'whatsapp', 'navegacion'],
      minutosAnticipacion: null,
    });

    const resultado = await enviarRecordatorio(reserva);

    expect(emailAdapter.enviar).not.toHaveBeenCalled();
    expect(whatsappAdapter.enviar).not.toHaveBeenCalled();
    expect(Notificacion.create).toHaveBeenCalledWith(
      expect.objectContaining({ canal: 'navegacion', estado: 'omitido' })
    );
    expect(reserva.recordatorioEnviado).toBe(true);
    expect(resultado.resultados[0].estado).toBe('omitido');
  });

  it('permite al usuario consultar y actualizar sus preferencias', async () => {
    const usuario = {
      _id: 'cli-pref-1',
      activo: true,
      preferenciasRecordatorio: {
        activo: true,
        canales: ['navegacion'],
        minutosAnticipacion: 30,
      },
      save: jest.fn(),
    };
    User.findById.mockResolvedValue(usuario);

    const consulta = await request(app)
      .get('/api/mi-perfil/preferencias-recordatorio')
      .set('Authorization', `Bearer ${tokenPara('cliente', 'cli-pref-1')}`);

    expect(consulta.statusCode).toBe(200);
    expect(consulta.body.preferenciasRecordatorio.canales).toEqual(['navegacion']);

    const actualizacion = await request(app)
      .put('/api/mi-perfil/preferencias-recordatorio')
      .set('Authorization', `Bearer ${tokenPara('cliente', 'cli-pref-1')}`)
      .send({
        preferenciasRecordatorio: {
          activo: true,
          canales: ['email', 'navegacion'],
          minutosAnticipacion: 120,
        },
      });

    expect(actualizacion.statusCode).toBe(200);
    expect(usuario.save).toHaveBeenCalledTimes(1);
    expect(actualizacion.body.preferenciasRecordatorio.minutosAnticipacion).toBe(120);
  });

  it('valida canales y aplica RBAC en la edición administrativa', async () => {
    const usuario = {
      _id: 'cli-pref-2',
      activo: true,
      preferenciasRecordatorio: {
        activo: true,
        canales: ['email'],
        minutosAnticipacion: null,
      },
      save: jest.fn(),
    };
    User.findById.mockResolvedValue(usuario);

    const invalida = await request(app)
      .put('/api/usuarios/cli-pref-2/preferencias-recordatorio')
      .set('Authorization', `Bearer ${tokenPara('administrador', 'admin-1')}`)
      .send({ preferenciasRecordatorio: { activo: true, canales: ['sms'] } });

    expect(invalida.statusCode).toBe(400);

    const denegada = await request(app)
      .put('/api/usuarios/cli-pref-2/preferencias-recordatorio')
      .set('Authorization', `Bearer ${tokenPara('cliente', 'cli-pref-2')}`)
      .send({ preferenciasRecordatorio: { activo: true, canales: ['email'] } });

    expect(denegada.statusCode).toBe(403);

    const permitida = await request(app)
      .put('/api/usuarios/cli-pref-2/preferencias-recordatorio')
      .set('Authorization', `Bearer ${tokenPara('administrador', 'admin-1')}`)
      .send({
        preferenciasRecordatorio: {
          activo: true,
          canales: ['whatsapp'],
          minutosAnticipacion: 45,
        },
      });

    expect(permitida.statusCode).toBe(200);
    expect(usuario.save).toHaveBeenCalledTimes(1);
  });
});
