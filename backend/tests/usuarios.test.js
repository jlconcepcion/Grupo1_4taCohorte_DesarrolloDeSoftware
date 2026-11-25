jest.mock('../src/models/User');
const express = require('express');
const request = require('supertest');
const User = require('../src/models/User');
const usuariosRoutes = require('../src/routes/usuarios.routes');

function crearApp(rol) {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    if (rol) req.user = { id: 'u1', rol };
    next();
  });
  app.use('/api/usuarios', usuariosRoutes);
  return app;
}

const datos = { correo: 'instructor@gym.com', password: 'Clave12345', rol: 'instructor' };

describe('POST /api/usuarios como administrador', () => {
  const app = crearApp('administrador');

  it('crea un instructor y responde 201', async () => {
    User.create.mockResolvedValue({ correo: datos.correo, rol: 'instructor' });
    const res = await request(app).post('/api/usuarios').send(datos);
    expect(res.statusCode).toBe(201);
    expect(res.body.rol).toBe('instructor');
    expect(res.body.password).toBeUndefined();
  });

  it('crea usuarios con nombre de usuario opcional', async () => {
    User.create.mockResolvedValue({ correo: 'nombre@gym.com', rol: 'cliente' });
    const res = await request(app)
      .post('/api/usuarios')
      .send({ ...datos, correo: 'nombre@gym.com', rol: 'cliente', nombreUsuario: 'Carlos' });

    expect(res.statusCode).toBe(201);
    expect(User.create).toHaveBeenCalledWith(
      expect.objectContaining({ nombreUsuario: 'Carlos' })
    );
  });

  it('rechaza un correo duplicado con 409', async () => {
    User.create.mockRejectedValue({ code: 11000 });
    const res = await request(app).post('/api/usuarios').send(datos);
    expect(res.statusCode).toBe(409);
  });

  it('rechaza datos inválidos con 400', async () => {
    const res = await request(app)
      .post('/api/usuarios')
      .send({ correo: 'malo', password: '123', rol: 'rey' });
    expect(res.statusCode).toBe(400);
    expect(res.body.errores).toHaveLength(3);
  });
});

describe('Acceso denegado por rol', () => {
  it.each(['cliente', 'coordinador', 'instructor'])('%s recibe 403', async (rol) => {
    const res = await request(crearApp(rol)).post('/api/usuarios').send(datos);
    expect(res.statusCode).toBe(403);
  });

  it('sin sesión recibe 401', async () => {
    const res = await request(crearApp(null)).post('/api/usuarios').send(datos);
    expect(res.statusCode).toBe(401);
  });
});

describe('PATCH /api/usuarios/:id', () => {
  beforeEach(() => jest.clearAllMocks());

  function usuarioEditable() {
    const usuario = {
      _id: 'u1',
      correo: 'persona@gym.com',
      nombreUsuario: 'Nombre anterior',
      telefono: '',
      activo: true,
      save: jest.fn().mockResolvedValue(undefined),
    };
    return usuario;
  }

  it('permite al propio usuario actualizar nombre y teléfono', async () => {
    const usuario = usuarioEditable();
    User.findById.mockResolvedValue(usuario);

    const res = await request(crearApp('cliente'))
      .patch('/api/usuarios/u1')
      .send({ nombreUsuario: 'Sofia', telefono: '+573001234567' });

    expect(res.statusCode).toBe(200);
    expect(usuario.nombreUsuario).toBe('Sofia');
    expect(usuario.telefono).toBe('+573001234567');
    expect(usuario.save).toHaveBeenCalled();
  });

  it('permite al administrador editar a otro usuario', async () => {
    const usuario = usuarioEditable();
    User.findById.mockResolvedValue(usuario);

    const res = await request(crearApp('administrador'))
      .patch('/api/usuarios/u2')
      .send({ nombreUsuario: 'Coordinadora' });

    expect(res.statusCode).toBe(200);
    expect(usuario.nombreUsuario).toBe('Coordinadora');
  });

  it('permite quitar el nombre para volver a mostrar el correo', async () => {
    const usuario = usuarioEditable();
    User.findById.mockResolvedValue(usuario);

    const res = await request(crearApp('cliente'))
      .patch('/api/usuarios/u1')
      .send({ nombreUsuario: '' });

    expect(res.statusCode).toBe(200);
    expect(usuario.nombreUsuario).toBe('');
  });

  it('rechaza editar a otro usuario si no es administrador', async () => {
    const res = await request(crearApp('instructor'))
      .patch('/api/usuarios/u2')
      .send({ nombreUsuario: 'Otro' });

    expect(res.statusCode).toBe(403);
    expect(User.findById).not.toHaveBeenCalled();
  });

  it('valida longitud del nombre y formato del teléfono', async () => {
    User.findById.mockResolvedValue(usuarioEditable());

    const res = await request(crearApp('cliente'))
      .patch('/api/usuarios/u1')
      .send({ nombreUsuario: 'x'.repeat(41), telefono: 'abc' });

    expect(res.statusCode).toBe(400);
    expect(res.body.errores).toHaveLength(2);
  });

  it('rechaza campos no permitidos', async () => {
    const res = await request(crearApp('cliente'))
      .patch('/api/usuarios/u1')
      .send({ rol: 'administrador' });

    expect(res.statusCode).toBe(400);
  });
});