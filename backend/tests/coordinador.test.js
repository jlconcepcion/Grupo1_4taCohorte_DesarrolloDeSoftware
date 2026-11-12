const express = require('express');
const request = require('supertest');
const { requirePermiso } = require('../src/middlewares/roles');
const { PERMISOS } = require('../src/config/permisos');

// App de prueba: simula que el login ya dejó el usuario en req.user
function crearApp(rol) {
  const app = express();
  app.use((req, res, next) => {
    req.user = rol ? { id: 'u1', rol } : undefined;
    next();
  });
  app.post('/usuarios', requirePermiso('usuarios:crear'), (req, res) => res.status(201).json({ ok: true }));
  app.post('/recintos', requirePermiso('recintos:gestionar'), (req, res) => res.status(201).json({ ok: true }));
  app.get('/reservas', requirePermiso('reservas:gestionar'), (req, res) => res.json({ ok: true }));
  app.put('/horarios/1', requirePermiso('horarios:gestionar'), (req, res) => res.json({ ok: true }));
  app.get('/reportes', requirePermiso('reportes:ver'), (req, res) => res.json({ ok: true }));
  return app;
}

describe('Permisos del coordinador', () => {
  const app = crearApp('coordinador');

  it('puede gestionar reservas', async () => {
    expect((await request(app).get('/reservas')).statusCode).toBe(200);
  });

  it('puede gestionar horarios de instructores', async () => {
    expect((await request(app).put('/horarios/1')).statusCode).toBe(200);
  });

  it('puede ver reportes', async () => {
    expect((await request(app).get('/reportes')).statusCode).toBe(200);
  });

  it('NO puede crear usuarios (403)', async () => {
    expect((await request(app).post('/usuarios')).statusCode).toBe(403);
  });

  it('NO puede gestionar recintos (403)', async () => {
    expect((await request(app).post('/recintos')).statusCode).toBe(403);
  });
});

describe('Coherencia de la matriz', () => {
  it('el administrador puede todo lo que puede el coordinador', () => {
    Object.values(PERMISOS).forEach((roles) => {
      if (roles.includes('coordinador')) {
        expect(roles).toContain('administrador');
      }
    });
  });

  it('un usuario sin sesión recibe 401', async () => {
    const res = await request(crearApp(null)).get('/reservas');
    expect(res.statusCode).toBe(401);
  });
});
