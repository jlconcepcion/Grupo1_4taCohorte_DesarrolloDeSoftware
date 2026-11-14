import { useState } from 'react';
import { auth } from '../api.js';

const CORREO_REGEX = /^\S+@\S+\.\S+$/;

export default function Registro({ onLogin, onIrALogin }) {
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);

  async function manejarEnvio(evento) {
    evento.preventDefault();

    const nuevosErrores = {};
    if (!correo) nuevosErrores.correo = 'Ingresa tu correo';
    else if (!CORREO_REGEX.test(correo)) nuevosErrores.correo = 'Correo inválido';
    if (!password) nuevosErrores.password = 'Ingresa una contraseña';
    else if (password.length < 8) {
      nuevosErrores.password = 'Debe tener al menos 8 caracteres';
    }
    if (password && confirmacion !== password) {
      nuevosErrores.confirmacion = 'Las contraseñas no coinciden';
    }

    setErrores(nuevosErrores);
    if (Object.keys(nuevosErrores).length) return;

    setEnviando(true);
    try {
      const datos = await auth.registro(correo.trim(), password);
      onLogin(datos.token, datos.usuario);
    } catch (error) {
      setErrores({ general: error.message });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="pantalla-auth">
      <section className="tarjeta">
        <header className="marca">
          <span className="logo">G1</span>
          <h1>Crea tu cuenta</h1>
          <p>Regístrate como cliente para reservar canchas y clases.</p>
        </header>

        <form className="formulario" onSubmit={manejarEnvio} noValidate>
          <label>
            Correo electrónico
            <input
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              placeholder="tu@gimnasio.com"
              autoComplete="email"
            />
            {errores.correo && <span className="error-campo">{errores.correo}</span>}
          </label>

          <label>
            Contraseña
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              autoComplete="new-password"
            />
            {errores.password && <span className="error-campo">{errores.password}</span>}
          </label>

          <label>
            Repetir contraseña
            <input
              type="password"
              value={confirmacion}
              onChange={(e) => setConfirmacion(e.target.value)}
              placeholder="Repite tu contraseña"
              autoComplete="new-password"
            />
            {errores.confirmacion && (
              <span className="error-campo">{errores.confirmacion}</span>
            )}
          </label>

          {errores.general && (
            <p className="error-general" role="alert">
              {errores.general}
            </p>
          )}

          <button type="submit" disabled={enviando}>
            {enviando ? 'Creando cuenta…' : 'Crear cuenta'}
          </button>
        </form>

        <p className="cambio-vista">
          ¿Ya tienes cuenta?{' '}
          <button type="button" className="enlace" onClick={onIrALogin}>
            Inicia sesión
          </button>
        </p>
      </section>
    </main>
  );
}
