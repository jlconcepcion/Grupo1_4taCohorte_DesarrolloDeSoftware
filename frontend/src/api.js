const TOKEN_KEY = 'reservas_token';
const USER_KEY = 'reservas_usuario';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getUsuario() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY));
  } catch {
    return null;
  }
}

export function guardarSesion(token, usuario) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(usuario));
}

export function cerrarSesion() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

async function peticion(ruta, opciones = {}) {
  const headers = { 'Content-Type': 'application/json', ...opciones.headers };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const respuesta = await fetch(`/api${ruta}`, { ...opciones, headers });
  const datos = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok) {
    const error = new Error(datos.mensaje || 'No se pudo completar la solicitud');
    error.status = respuesta.status;
    error.errores = datos.errores || [];
    throw error;
  }

  return datos;
}

export const auth = {
  login: (correo, password) =>
    peticion('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ correo, password }),
    }),
  registro: (correo, password) =>
    peticion('/auth/registro', {
      method: 'POST',
      body: JSON.stringify({ correo, password }),
    }),
  perfil: () => peticion('/auth/perfil'),
};

export const usuariosApi = {
  listar: (rol = '') => peticion(`/usuarios${rol ? `?rol=${encodeURIComponent(rol)}` : ''}`),
  crear: (datos) =>
    peticion('/usuarios', {
      method: 'POST',
      body: JSON.stringify(datos),
    }),
};

export const recintosApi = {
  listar: (soloActivos = false) =>
    peticion(`/recintos${soloActivos ? '?soloActivos=true' : ''}`),
  crear: (datos) =>
    peticion('/recintos', {
      method: 'POST',
      body: JSON.stringify(datos),
    }),
  actualizar: (id, datos) =>
    peticion(`/recintos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(datos),
    }),
};

export const clasesApi = {
  listar: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return peticion(`/clases${qs ? `?${qs}` : ''}`);
  },
  crear: (datos) =>
    peticion('/clases', {
      method: 'POST',
      body: JSON.stringify(datos),
    }),
  actualizar: (id, datos) =>
    peticion(`/clases/${id}`, {
      method: 'PUT',
      body: JSON.stringify(datos),
    }),
};

export const bloquesApi = {
  listar: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return peticion(`/bloques${qs ? `?${qs}` : ''}`);
  },
  crear: (datos) =>
    peticion('/bloques', {
      method: 'POST',
      body: JSON.stringify(datos),
    }),
  actualizar: (id, datos) =>
    peticion(`/bloques/${id}`, {
      method: 'PUT',
      body: JSON.stringify(datos),
    }),
  eliminar: (id) =>
    peticion(`/bloques/${id}`, {
      method: 'DELETE',
    }),
};
