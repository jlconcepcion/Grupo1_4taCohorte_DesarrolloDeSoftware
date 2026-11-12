const { requirePermiso } = require('../src/middlewares/roles');

function ejecutar(middleware, user) {
  const req = { user };
  const res = {
    statusCode: null,
    body: null,
    status(codigo) { this.statusCode = codigo; return this; },
    json(cuerpo) { this.body = cuerpo; return this; },
  };
  const next = jest.fn();
  middleware(req, res, next);
  return { res, next };
}

describe('requirePermiso', () => {
  it('responde 401 si no hay usuario autenticado', () => {
    const { res, next } = ejecutar(requirePermiso('usuarios:crear'), undefined);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('deja pasar a un rol autorizado', () => {
    const { res, next } = ejecutar(requirePermiso('usuarios:crear'), { rol: 'administrador' });
    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBeNull();
  });

  it('responde 403 a un rol no autorizado', () => {
    const { res, next } = ejecutar(requirePermiso('usuarios:crear'), { rol: 'cliente' });
    expect(res.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('lanza error si el permiso no existe', () => {
    expect(() => requirePermiso('cosa:inventada')).toThrow();
  });
});
