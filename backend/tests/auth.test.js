process.env.JWT_SECRET = 'secreto-de-prueba';

jest.mock('../src/models/User');
const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');

function usuarioMock({ rol = 'cliente', activo = true, passwordValida = true } = {}) {
  return {
    _id: 'u1',
    correo: 'persona@gym.com',
    rol,
    activo,
    compararPassword: jest.fn().mockResolvedValue(passwordValida),
  };
}

async function loginComo(rol) {
  User.findOne.mockResolvedValue(usuarioMock({ rol }));
  const res = await request(app)
    .post('/api/auth/login')
    .send({ correo: 'persona@gym.com', password: 'Clave12345' });
  return res.body.token;
}

beforeEach(() => jest.clearAllMocks());

describe('POST /api/auth/registro (ST01.03)', () => {
  it('crea un cliente, devuelve 201 y un token', async () => {
    User.create.mockResolvedValue({ _id: 'u1', correo: 'nuevo@gym.com', rol: 'cliente' });

    const res = await request(app)
      .post('/api/auth/registro')
      .send({ correo: 'nuevo@gym.com', password: 'Clave12345' });

    expect(res.statusCode).toBe(201);
    expect(res.body.usuario.rol).toBe('cliente');
    expect(res.body.token).toEqual(expect.any(String));
  });

  it('guarda el nombre de usuario opcional sin usarlo para el login', async () => {
    User.create.mockResolvedValue({
      _id: 'u2',
      correo: 'nombre@gym.com',
      rol: 'cliente',
      nombreUsuario: 'Sofia',
    });

    const res = await request(app).post('/api/auth/registro').send({
      correo: 'nombre@gym.com',
      password: 'Clave12345',
      nombreUsuario: '  Sofia  ',
    });

    expect(res.statusCode).toBe(201);
    expect(User.create).toHaveBeenCalledWith(
      expect.objectContaining({ nombreUsuario: 'Sofia' })
    );
  });

  it('rechaza un nombre de usuario demasiado largo con 400', async () => {
    const res = await request(app)
      .post('/api/auth/registro')
      .send({ correo: 'largo@gym.com', password: 'Clave12345', nombreUsuario: 'x'.repeat(41) });

    expect(res.statusCode).toBe(400);
    expect(res.body.errores).toContain('El nombre de usuario no puede superar los 40 caracteres');
    expect(User.create).not.toHaveBeenCalled();
  });

  it('rechaza datos inválidos con 400 y un error por campo', async () => {
    const res = await request(app)
      .post('/api/auth/registro')
      .send({ correo: 'malo', password: '123' });

    expect(res.statusCode).toBe(400);
    expect(res.body.errores).toHaveLength(2);
    expect(User.create).not.toHaveBeenCalled();
  });

  it('rechaza un correo duplicado con 409', async () => {
    User.create.mockRejectedValue({ code: 11000 });

    const res = await request(app)
      .post('/api/auth/registro')
      .send({ correo: 'dup@gym.com', password: 'Clave12345' });

    expect(res.statusCode).toBe(409);
  });
});

describe('POST /api/auth/login (ST01.04)', () => {
  it('devuelve token con credenciales válidas', async () => {
    User.findOne.mockResolvedValue(usuarioMock({ rol: 'coordinador' }));

    const res = await request(app)
      .post('/api/auth/login')
      .send({ correo: 'persona@gym.com', password: 'Clave12345' });

    expect(res.statusCode).toBe(200);
    expect(res.body.usuario.rol).toBe('coordinador');
    expect(res.body.token).toEqual(expect.any(String));
  });

  it('rechaza credenciales incorrectas con mensaje genérico', async () => {
    User.findOne.mockResolvedValue(usuarioMock({ passwordValida: false }));

    const res = await request(app)
      .post('/api/auth/login')
      .send({ correo: 'persona@gym.com', password: 'incorrecta' });

    expect(res.statusCode).toBe(401);
    expect(res.body.mensaje).toBe('Credenciales incorrectas');
  });

  it('rechaza un usuario inexistente con 401', async () => {
    User.findOne.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ correo: 'nadie@gym.com', password: 'Clave12345' });

    expect(res.statusCode).toBe(401);
  });

  it('rechaza un usuario inactivo con 401', async () => {
    User.findOne.mockResolvedValue(usuarioMock({ activo: false }));

    const res = await request(app)
      .post('/api/auth/login')
      .send({ correo: 'persona@gym.com', password: 'Clave12345' });

    expect(res.statusCode).toBe(401);
  });

  it('exige correo y contraseña con 400', async () => {
    const res = await request(app).post('/api/auth/login').send({});

    expect(res.statusCode).toBe(400);
  });
});

describe('Acceso denegado por rol (ST01.08)', () => {
  const datos = { correo: 'x@gym.com', password: 'Clave12345', rol: 'instructor' };

  it('un cliente recibe 403 al crear usuarios', async () => {
    const token = await loginComo('cliente');

    const res = await request(app)
      .post('/api/usuarios')
      .set('Authorization', `Bearer ${token}`)
      .send(datos);

    expect(res.statusCode).toBe(403);
  });

  it('un administrador crea usuarios con 201', async () => {
    const token = await loginComo('administrador');
    User.create.mockResolvedValue({ _id: 'u2', correo: datos.correo, rol: 'instructor' });

    const res = await request(app)
      .post('/api/usuarios')
      .set('Authorization', `Bearer ${token}`)
      .send(datos);

    expect(res.statusCode).toBe(201);
  });

  it('sin token recibe 401', async () => {
    const res = await request(app).post('/api/usuarios').send(datos);
    expect(res.statusCode).toBe(401);
  });

  it('con token inválido recibe 401', async () => {
    const res = await request(app)
      .post('/api/usuarios')
      .set('Authorization', 'Bearer token-roto')
      .send(datos);

    expect(res.statusCode).toBe(401);
  });
});
