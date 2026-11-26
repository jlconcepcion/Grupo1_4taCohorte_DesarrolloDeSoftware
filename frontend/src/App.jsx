import { useEffect, useState } from 'react';
import Login from './pages/Login.jsx';
import Registro from './pages/Registro.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Landing from './pages/Landing.jsx';
import { auth, cerrarSesion, getToken, getUsuario, guardarSesion } from './api.js';

const ETIQUETAS_ROL = {
  administrador: 'Administrador',
  coordinador: 'Coordinador',
  instructor: 'Instructor',
  cliente: 'Cliente',
};

export default function App() {
  const [usuario, setUsuario] = useState(getUsuario);
  const [vista, setVista] = useState('landing');
  const [avisoConfirmacion, setAvisoConfirmacion] = useState(() => {
    const parametros = new URLSearchParams(window.location.search);
    if (!parametros.has('confirmar')) return null;
    return {
      ok: parametros.get('confirmar') === 'ok',
      mensaje: parametros.get('motivo') || '',
    };
  });
  const autenticado = Boolean(usuario && getToken());

  useEffect(() => {
    if (!getToken()) return;
    auth
      .perfil()
      .then(setUsuario)
      .catch((error) => {
        if (error.status === 401) {
          cerrarSesion();
          setUsuario(null);
        }
      });
  }, []);

  useEffect(() => {
    if (!avisoConfirmacion) return;
    window.history.replaceState({}, '', window.location.pathname);
  }, [avisoConfirmacion]);

  useEffect(() => {
    if (!autenticado || !usuario) {
      document.title = 'FitBook';
      return;
    }
    const nombre = usuario.nombreUsuario || usuario.correo?.split('@')[0];
    const rol = ETIQUETAS_ROL[usuario.rol] || 'Usuario';
    document.title = nombre ? `FitBook · ${nombre} · ${rol}` : `FitBook · ${rol}`;
  }, [autenticado, usuario]);

  function iniciarSesion(token, datos) {
    guardarSesion(token, datos);
    setUsuario(datos);
  }

  function salir() {
    cerrarSesion();
    setUsuario(null);
    setVista('landing');
  }

  function conAviso(contenido) {
    if (!avisoConfirmacion) return contenido;
    return (
      <>
        <div
          role="status"
          aria-live="polite"
          className={`fixed inset-x-0 top-4 z-50 mx-auto flex max-w-xl items-center gap-3 rounded-2xl border px-4 py-3 text-sm shadow-lg ${
            avisoConfirmacion.ok
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          <span className="font-bold">
            {avisoConfirmacion.ok ? 'Asistencia confirmada' : 'No se pudo confirmar'}
          </span>
          <span className="flex-1">
            {avisoConfirmacion.mensaje ||
              (avisoConfirmacion.ok
                ? 'Tu asistencia quedó registrada.'
                : 'El enlace de confirmación no es válido.')}
          </span>
          <button
            type="button"
            onClick={() => setAvisoConfirmacion(null)}
            className="font-bold underline"
          >
            Cerrar
          </button>
        </div>
        {contenido}
      </>
    );
  }

  if (autenticado) {
    return conAviso(
      <Dashboard usuario={usuario} onSalir={salir} onActualizarUsuario={setUsuario} />
    );
  }

  if (vista === 'login') {
    return conAviso(
      <Login
        onLogin={iniciarSesion}
        onIrARegistro={() => setVista('registro')}
        onVolver={() => setVista('landing')}
      />
    );
  }

  if (vista === 'registro') {
    return conAviso(
      <Registro
        onLogin={iniciarSesion}
        onIrALogin={() => setVista('login')}
        onVolver={() => setVista('landing')}
      />
    );
  }

  return conAviso(
    <Landing
      onIniciarSesion={() => setVista('login')}
      onCrearCuenta={() => setVista('registro')}
    />
  );
}
