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