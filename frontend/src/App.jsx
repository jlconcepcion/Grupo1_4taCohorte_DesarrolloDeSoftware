import { useEffect, useState } from 'react';
import Login from './pages/Login.jsx';
import Registro from './pages/Registro.jsx';
import Dashboard from './pages/Dashboard.jsx';
import { auth, cerrarSesion, getToken, getUsuario, guardarSesion } from './api.js';

export default function App() {
  const [usuario, setUsuario] = useState(getUsuario);
  const [vista, setVista] = useState('login');
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

  function iniciarSesion(token, datos) {
    guardarSesion(token, datos);
    setUsuario(datos);
  }

  function salir() {
    cerrarSesion();
    setUsuario(null);
    setVista('login');
  }

  if (autenticado) {
    return <Dashboard usuario={usuario} onSalir={salir} />;
  }

  if (vista === 'registro') {
    return (
      <Registro
        onLogin={iniciarSesion}
        onIrALogin={() => setVista('login')}
      />
    );
  }

  return (
    <Login
      onLogin={iniciarSesion}
      onIrARegistro={() => setVista('registro')}
    />
  );
}
