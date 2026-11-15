import { useState } from 'react';
import { auth } from '../api.js';

const CORREO_REGEX = /^\S+@\S+\.\S+$/;

export default function Login({ onLogin, onIrARegistro }) {
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);

  async function manejarEnvio(evento) {
    evento.preventDefault();

    const nuevosErrores = {};
    if (!correo) nuevosErrores.correo = 'Ingresa tu correo';
    else if (!CORREO_REGEX.test(correo)) nuevosErrores.correo = 'Correo inválido';
    if (!password) nuevosErrores.password = 'Ingresa tu contraseña';

    setErrores(nuevosErrores);
    if (Object.keys(nuevosErrores).length) return;

    setEnviando(true);
    try {
      const datos = await auth.login(correo.trim(), password);
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
          <h1>Reservas Gimnasio y Canchas</h1>
          <p>Inicia sesión para gestionar tus reservas.</p>
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
              placeholder="Tu contraseña"
              autoComplete="current-password"
            />
            {errores.password && <span className="error-campo">{errores.password}</span>}
          </label>

          {errores.general && (
            <p className="error-general" role="alert">
              {errores.general}
            </p>
          )}

          <button type="submit" disabled={enviando}>
            {enviando ? 'Ingresando…' : 'Iniciar sesión'}
          </button>
        </form>

        <p className="cambio-vista">
          ¿No tienes cuenta?{' '}
          <button type="button" className="enlace" onClick={onIrARegistro}>
            Regístrate
          </button>
        </p>
      </section>
    </main>
  );
}
