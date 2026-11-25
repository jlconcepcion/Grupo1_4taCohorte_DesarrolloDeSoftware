import { useState } from 'react';
import { auth } from '../api.js';
import Icon from '../components/Icon.jsx';

const CORREO_REGEX = /^\S+@\S+\.\S+$/;
const TELEFONO_REGEX = /^\+?[1-9]\d{1,14}$/;
const CANALES_RECORDATORIO = [
  { valor: 'email', etiqueta: 'Correo' },
  { valor: 'whatsapp', etiqueta: 'WhatsApp' },
  { valor: 'navegacion', etiqueta: 'Aviso en la app' },
];
const PREFERENCIAS_INICIALES = {
  activo: true,
  canales: ['email', 'whatsapp', 'navegacion'],
  minutosAnticipacion: null,
};

export default function Registro({ onLogin, onIrALogin, onVolver }) {
  const [correo, setCorreo] = useState('');
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [telefono, setTelefono] = useState('');
  const [password, setPassword] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [preferencias, setPreferencias] = useState(PREFERENCIAS_INICIALES);

  async function manejarEnvio(evento) {
    evento.preventDefault();

    const nuevosErrores = {};
    if (!correo) nuevosErrores.correo = 'Ingresa tu correo';
    else if (!CORREO_REGEX.test(correo)) nuevosErrores.correo = 'Correo inválido';
    if (nombreUsuario.trim().length > 40) {
      nuevosErrores.nombreUsuario = 'Máximo 40 caracteres';
    }
    if (telefono.trim() && !TELEFONO_REGEX.test(telefono.trim())) {
      nuevosErrores.telefono = 'Usa formato E.164, por ejemplo +573001234567';
    }
    if (!password) nuevosErrores.password = 'Ingresa una contraseña';
    else if (password.length < 8) {
      nuevosErrores.password = 'Debe tener al menos 8 caracteres';
    }
    if (password && confirmacion !== password) {
      nuevosErrores.confirmacion = 'Las contraseñas no coinciden';
    }
    if (preferencias.activo && preferencias.canales.length === 0) {
      nuevosErrores.preferencias = 'Selecciona al menos un canal de recordatorio';
    }

    setErrores(nuevosErrores);
    if (Object.keys(nuevosErrores).length) return;

    setEnviando(true);
    try {
      const datos = await auth.registro(
        correo.trim(),
        password,
        telefono.trim(),
        preferencias,
        nombreUsuario.trim()
      );
      onLogin(datos.token, datos.usuario);
    } catch (error) {
      setErrores({ general: error.message });
    } finally {
      setEnviando(false);
    }
  }

  function alternarCanal(canal) {
    setPreferencias((actual) => ({
      ...actual,
      canales: actual.canales.includes(canal)
        ? actual.canales.filter((item) => item !== canal)
        : [...actual.canales, canal],
    }));
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
                  Nombre de usuario (opcional)
                </span>
                <input
                  type="text"
                  value={nombreUsuario}
                  onChange={(e) => setNombreUsuario(e.target.value)}
                  placeholder="Cómo quieres que te reconozcan"
                  autoComplete="nickname"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 outline-none transition focus:border-[#1268e8] focus:bg-white focus:ring-4 focus:ring-blue-100"
                />
                <span className="mt-1 block text-xs text-slate-400">
                  Si lo dejas vacío, te verán con tu correo. No se usa para iniciar sesión.
                </span>
                {errores.nombreUsuario && (
                  <span className="mt-1 block text-xs font-medium text-red-600">
                    {errores.nombreUsuario}
                  </span>
                )}
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  WhatsApp (opcional)
                </span>
                <input
                  type="tel"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="+573001234567"
                  autoComplete="tel"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 outline-none transition focus:border-[#1268e8] focus:bg-white focus:ring-4 focus:ring-blue-100"
                />
                <span className="mt-1 block text-xs text-slate-400">
                  Recibirás el recordatorio y el enlace de asistencia por este número.
                </span>
                {errores.telefono && (
                  <span className="mt-1 block text-xs font-medium text-red-600">
                    {errores.telefono}
                  </span>
                )}
              </label>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="mb-3 text-sm font-semibold text-slate-700">
                  Preferencias del recordatorio
                </p>
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={preferencias.activo}
                    onChange={(e) =>
                      setPreferencias({ ...preferencias, activo: e.target.checked })
                    }
                  />
                  Recibir recordatorios de reservas
                </label>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {CANALES_RECORDATORIO.map((canal) => (
                    <label
                      key={canal.valor}
                      className="flex items-center gap-2 text-xs font-medium text-slate-600"
                    >
                      <input
                        type="checkbox"
                        checked={preferencias.canales.includes(canal.valor)}
                        onChange={() => alternarCanal(canal.valor)}
                      />
                      {canal.etiqueta}
                    </label>
                  ))}
                </div>
                <label className="mt-3 block text-xs font-semibold text-slate-600">
                  Anticipación
                  <select
                    value={preferencias.minutosAnticipacion ?? ''}
                    onChange={(e) =>
                      setPreferencias({
                        ...preferencias,
                        minutosAnticipacion: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  >
                    <option value="">Predeterminada (60 min)</option>
                    <option value="15">15 minutos</option>
                    <option value="30">30 minutos</option>
                    <option value="60">1 hora</option>
                    <option value="120">2 horas</option>
                    <option value="240">4 horas</option>
                    <option value="1440">24 horas</option>
                  </select>
                </label>
                {errores.preferencias && (
                  <span className="mt-2 block text-xs font-medium text-red-600">
                    {errores.preferencias}
                  </span>
                )}
              </div>

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
