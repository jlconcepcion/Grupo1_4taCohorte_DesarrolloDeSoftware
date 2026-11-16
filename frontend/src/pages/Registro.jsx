import { useState } from 'react';
import { auth } from '../api.js';
import Icon from '../components/Icon.jsx';

const CORREO_REGEX = /^\S+@\S+\.\S+$/;

export default function Registro({ onLogin, onIrALogin, onVolver }) {
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
    <main className="flex min-h-screen items-center justify-center bg-[#f7faff] px-4 py-10 text-[#10233f]">
      <div className="w-full max-w-md">
        <button
          type="button"
          onClick={onVolver}
          className="mb-6 flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-[#1268e8]"
        >
          <Icon name="arrow" className="h-4 w-4 rotate-180" />
          Volver al inicio
        </button>

        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(16,35,63,.14)]">
          <div className="h-2 bg-[#1268e8]" />
          <div className="p-7 sm:p-9">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1268e8] text-white">
              <Icon name="logo" className="h-7 w-7" />
            </div>
            <p className="mb-2 text-sm font-bold uppercase tracking-[0.18em] text-[#1268e8]">
              Empieza hoy
            </p>
            <h1 className="text-3xl font-bold tracking-tight">Crea tu cuenta</h1>
            <p className="mt-2 text-slate-500">
              Regístrate como cliente para reservar canchas y clases.
            </p>

            <form className="mt-7 space-y-5" onSubmit={manejarEnvio} noValidate>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Correo electrónico
                </span>
                <input
                  type="email"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  placeholder="tu@gimnasio.com"
                  autoComplete="email"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 outline-none transition focus:border-[#1268e8] focus:bg-white focus:ring-4 focus:ring-blue-100"
                />
                {errores.correo && (
                  <span className="mt-1 block text-xs font-medium text-red-600">
                    {errores.correo}
                  </span>
                )}
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Contraseña
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 outline-none transition focus:border-[#1268e8] focus:bg-white focus:ring-4 focus:ring-blue-100"
                />
                {errores.password && (
                  <span className="mt-1 block text-xs font-medium text-red-600">
                    {errores.password}
                  </span>
                )}
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Repetir contraseña
                </span>
                <input
                  type="password"
                  value={confirmacion}
                  onChange={(e) => setConfirmacion(e.target.value)}
                  placeholder="Repite tu contraseña"
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 outline-none transition focus:border-[#1268e8] focus:bg-white focus:ring-4 focus:ring-blue-100"
                />
                {errores.confirmacion && (
                  <span className="mt-1 block text-xs font-medium text-red-600">
                    {errores.confirmacion}
                  </span>
                )}
              </label>

              {errores.general && (
                <p
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600"
                  role="alert"
                >
                  {errores.general}
                </p>
              )}

              <button
                type="submit"
                disabled={enviando}
                className="primary-button w-full disabled:cursor-not-allowed disabled:opacity-60"
              >
                {enviando ? 'Creando cuenta…' : 'Crear cuenta'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              ¿Ya tienes cuenta?{' '}
              <button
                type="button"
                onClick={onIrALogin}
                className="font-bold text-[#1268e8] hover:underline"
              >
                Inicia sesión
              </button>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
