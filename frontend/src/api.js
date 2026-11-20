const TOKEN_KEY = 'reservas_token';
const USER_KEY = 'reservas_usuario';

export function getToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function getUsuario() {
  try {
    return JSON.parse(sessionStorage.getItem(USER_KEY));
  } catch {
    return null;
  }
}

export function guardarSesion(token, usuario) {
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(USER_KEY, JSON.stringify(usuario));
}

export function cerrarSesion() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
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

function armarQuery(params = {}) {
  const limpio = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') {
      limpio[k] = v;
    }
  }
  const qs = new URLSearchParams(limpio).toString();
  return qs ? `?${qs}` : '';
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
  listar: (params = {}) => peticion(`/clases${armarQuery(params)}`),
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
  listar: (params = {}) => peticion(`/bloques${armarQuery(params)}`),
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

export const reservasApi = {
  disponibilidad: (filtros = {}) =>
    peticion(`/reservas/disponibilidad${armarQuery(filtros)}`),
  crear: ({ bloqueId, fecha }) =>
    peticion('/reservas', {
      method: 'POST',
      body: JSON.stringify({ bloqueId, fecha }),
    }),
  mias: (tipo = 'todas') => peticion(`/reservas/mias${armarQuery({ tipo })}`),
  confirmarAsistencia: (id) =>
    peticion(`/reservas/${id}/confirmar-asistencia`, {
      method: 'PATCH',
    }),
  cancelarPropia: (id, motivo = '') =>
    peticion(`/reservas/${id}/cancelar-propia`, {
      method: 'PATCH',
      body: JSON.stringify({ motivo }),
    }),
  listarTodas: (filtros = {}) => peticion(`/reservas${armarQuery(filtros)}`),
  confirmarCoordinador: (id) =>
    peticion(`/reservas/${id}/confirmar`, {
      method: 'PATCH',
    }),
  cancelarCoordinador: (id, motivo = '') =>
    peticion(`/reservas/${id}/cancelar`, {
      method: 'PATCH',
      body: JSON.stringify({ motivo }),
    }),
  reasignarAdmin: (id, datos) =>
    peticion(`/reservas/${id}/reasignar`, {
      method: 'PATCH',
      body: JSON.stringify(datos),
    }),
  conteoInstructor: (filtros = {}) =>
    peticion(`/reservas/conteo-instructor${armarQuery(filtros)}`),
};
