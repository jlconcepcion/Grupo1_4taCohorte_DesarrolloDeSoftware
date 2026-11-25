const emailAdapter = require('../src/services/canales/email.adapter');

describe('ST04.01 · Adaptador de correo con soporte Mailgrid SMTP y Mailgrid API HTTP', () => {
  const envOriginal = { ...process.env };
  const fetchOriginal = global.fetch;

  beforeEach(() => {
    process.env = { ...envOriginal };
    emailAdapter.__setTransporter(null);
  });

  afterAll(() => {
    process.env = envOriginal;
    global.fetch = fetchOriginal;
  });

  it('omite el envío si no hay SMTP_HOST ni modo mailgrid-api configurado', async () => {
    delete process.env.SMTP_HOST;
    delete process.env.EMAIL_PROVIDER;

    const resultado = await emailAdapter.enviar({
      destino: 'cliente@gym.com',
      asunto: 'Recordatorio',
      texto: 'Hola',
    });

    expect(resultado).toEqual({
      estado: 'omitido',
      motivo: 'SMTP no configurado',
    });
  });

  it('envía por SMTP (Mailgrid SMTP / Mailpit) cuando EMAIL_PROVIDER=smtp', async () => {
    process.env.EMAIL_PROVIDER = 'smtp';
    process.env.SMTP_HOST = 'cloud.mailgrid.net.br';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_USER = 'usr_mailgrid';
    process.env.SMTP_PASS = 'clave_mailgrid';
    process.env.SMTP_FROM = 'FitBook <no-reply@gym.com>';

    const sendMailMock = jest.fn().mockResolvedValue({ messageId: '<mg-smtp-123>' });
    emailAdapter.__setTransporter({ sendMail: sendMailMock });

    const resultado = await emailAdapter.enviar({
      destino: 'cliente@gym.com',
      asunto: 'Confirma tu reserva',
      texto: 'Texto plano',
      html: '<p>HTML</p>',
    });

    expect(resultado).toEqual({
      estado: 'enviado',
      proveedorId: '<mg-smtp-123>',
    });
    expect(sendMailMock).toHaveBeenCalledWith({
      from: 'FitBook <no-reply@gym.com>',
      to: 'cliente@gym.com',
      subject: 'Confirma tu reserva',
      text: 'Texto plano',
      html: '<p>HTML</p>',
    });
  });

  it('envía por la API HTTP REST de Mailgrid cuando EMAIL_PROVIDER=mailgrid-api', async () => {
    process.env.EMAIL_PROVIDER = 'mailgrid-api';
    process.env.MAILGRID_API_URL = 'https://api.mailgrid.net.br/send/';
    process.env.MAILGRID_API_KEY = 'mg_key_test_123';
    process.env.MAILGRID_FROM_EMAIL = 'no-reply@gym.com';
    process.env.MAILGRID_FROM_NAME = 'FitBook Gimnasio';

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'mg-http-999' }),
    });

    const resultado = await emailAdapter.enviar({
      destino: 'cliente@gym.com',
      asunto: 'Recordatorio de reserva',
      texto: 'Confirma tu asistencia',
      html: '<p>Confirma tu asistencia</p>',
    });

    expect(resultado).toEqual({
      estado: 'enviado',
      proveedorId: 'mg-http-999',
    });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.mailgrid.net.br/send/',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer mg_key_test_123',
        }),
      })
    );
  });
});
