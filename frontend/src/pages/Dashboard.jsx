import { useEffect, useState } from 'react';
import Icon from '../components/Icon.jsx';
import {
  usuariosApi,
  recintosApi,
  clasesApi,
  bloquesApi,
} from '../api.js';

const DIAS_SEMANA = [
  { valor: 1, etiqueta: 'Lunes' },
  { valor: 2, etiqueta: 'Martes' },
  { valor: 3, etiqueta: 'Miércoles' },
  { valor: 4, etiqueta: 'Jueves' },
  { valor: 5, etiqueta: 'Viernes' },
  { valor: 6, etiqueta: 'Sábado' },
  { valor: 0, etiqueta: 'Domingo' },
];

function nombreDia(numero) {
  const encontrado = DIAS_SEMANA.find((d) => d.valor === Number(numero));
  return encontrado ? encontrado.etiqueta : `Día ${numero}`;
}

const ROLES_META = {
  cliente: {
    nombre: 'Cliente',
    icono: 'calendar',
    descripcion:
      'Consulta los recintos activos, horarios e instructores disponibles y haz seguimiento a tus próximas reservas.',
  },
  instructor: {
    nombre: 'Instructor',
    icono: 'users',
    descripcion:
      'Crea tus clases en recintos activos y publica o actualiza tus bloques de disponibilidad sin solapamientos.',
  },
  coordinador: {
    nombre: 'Coordinador',
    icono: 'activity',
    descripcion:
      'Supervisa y edita los bloques de horario de cualquier instructor por recinto con registro de auditoría.',
  },
  administrador: {
    nombre: 'Administrador',
    icono: 'target',
    descripcion:
      'Gestiona recintos (alta, edición y desactivación), cuentas de usuarios/instructores y horarios del club.',
  },
};

export default function Dashboard({ usuario, onSalir }) {
  const rolInfo = ROLES_META[usuario?.rol] || {
    nombre: usuario?.rol || 'Usuario',
    icono: 'logo',
    descripcion: 'Sesión activa.',
  };

  const [recintos, setRecintos] = useState([]);
  const [clases, setClases] = useState([]);
  const [bloques, setBloques] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mensajeExito, setMensajeExito] = useState('');
  const [mensajeError, setMensajeError] = useState('');

  // Estado para formulario de Recintos (HU04 / HU05 - Administrador)
  const [formRecinto, setFormRecinto] = useState({
    id: null,
    nombre: '',
    tipo: 'Fútbol 5',
    capacidad: 10,
    descripcion: '',
  });

  // Estado para formulario de Usuarios (HU03 - Administrador)
  const [formUsuario, setFormUsuario] = useState({
    correo: '',
    password: '',
    rol: 'instructor',
  });

  // Estado para formulario de Clases (HU06 - Instructor)
  const [formClase, setFormClase] = useState({
    id: null,
    nombre: '',
    tipoRutina: '',
    recinto: '',
  });

  // Estado para formulario de Bloques (HU07 / HU08 / HU09 - Instructor / Coordinador / Admin)
  const [formBloque, setFormBloque] = useState({
    id: null,
    clase: '',
    recinto: '',
    diaSemana: 1,
    horaInicio: '16:00',
    horaFin: '18:00',
    capacidad: 12,
  });

  // Filtros de consulta por recinto y día (Coordinador / Cliente)
  const [filtroRecinto, setFiltroRecinto] = useState('');
  const [filtroDia, setFiltroDia] = useState('');

  function limpiarAvisos() {
    setMensajeExito('');
    setMensajeError('');
  }

  async function cargarDatos() {
    setCargando(true);
    try {
      const esCliente = usuario?.rol === 'cliente';
      const esInstructor = usuario?.rol === 'instructor';
      const esAdmin = usuario?.rol === 'administrador';

      const [listaRecintos, listaClases, listaBloques] = await Promise.all([
        recintosApi.listar(esCliente),
        clasesApi.listar(esInstructor ? { propias: 'true' } : {}),
        bloquesApi.listar(esInstructor ? { propios: 'true' } : {}),
      ]);

      setRecintos(Array.isArray(listaRecintos) ? listaRecintos : []);
      setClases(Array.isArray(listaClases) ? listaClases : []);
      setBloques(Array.isArray(listaBloques) ? listaBloques : []);

      if (esAdmin) {
        const listaUsuarios = await usuariosApi.listar().catch(() => []);
        setUsuarios(Array.isArray(listaUsuarios) ? listaUsuarios : []);
      }
    } catch (err) {
      setMensajeError(err.message || 'Error al cargar los datos del panel');
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarDatos();
  }, [usuario?.rol]);

  const recintosActivos = recintos.filter((r) => r.activo !== false);

  // ===========================================================================
  // Acciones Administrador: Recintos (HU04, HU05, ST02.03) y Usuarios (HU03)
  // ===========================================================================
  async function guardarRecinto(e) {
    e.preventDefault();
    limpiarAvisos();
    try {
      const payload = {
        nombre: formRecinto.nombre,
        tipo: formRecinto.tipo,
        capacidad: Number(formRecinto.capacidad),
        descripcion: formRecinto.descripcion,
      };
      if (formRecinto.id) {
        await recintosApi.actualizar(formRecinto.id, payload);
        setMensajeExito('Recinto actualizado correctamente.');
      } else {
        await recintosApi.crear(payload);
        setMensajeExito('Recinto creado y activado correctamente.');
      }
      setFormRecinto({ id: null, nombre: '', tipo: 'Fútbol 5', capacidad: 10, descripcion: '' });
      await cargarDatos();
    } catch (err) {
      setMensajeError(err.errores?.join(' · ') || err.message);
    }
  }

  async function alternarEstadoRecinto(recinto) {
    limpiarAvisos();
    try {
      await recintosApi.actualizar(recinto._id, { activo: !recinto.activo });
      setMensajeExito(
        `Recinto "${recinto.nombre}" ${!recinto.activo ? 'activado' : 'desactivado'} (historial conservado).`
      );
      await cargarDatos();
    } catch (err) {
      setMensajeError(err.message);
    }
  }

  async function guardarNuevoUsuario(e) {
    e.preventDefault();
    limpiarAvisos();
    try {
      await usuariosApi.crear(formUsuario);
      setMensajeExito(`Cuenta creada para ${formUsuario.correo} con rol ${formUsuario.rol}.`);
      setFormUsuario({ correo: '', password: '', rol: 'instructor' });
      await cargarDatos();
    } catch (err) {
      setMensajeError(err.errores?.join(' · ') || err.message);
    }
  }

  // ===========================================================================
  // Acciones Instructor: Clases (HU06) y Bloques Propios (HU07, HU08, ST02.08)
  // ===========================================================================
  async function guardarClase(e) {
    e.preventDefault();
    limpiarAvisos();
    try {
      if (formClase.id) {
        await clasesApi.actualizar(formClase.id, {
          nombre: formClase.nombre,
          tipoRutina: formClase.tipoRutina,
          recinto: formClase.recinto,
        });
        setMensajeExito('Clase actualizada correctamente.');
      } else {
        await clasesApi.crear({
          nombre: formClase.nombre,
          tipoRutina: formClase.tipoRutina,
          recinto: formClase.recinto,
        });
        setMensajeExito('Clase creada y vinculada al recinto activo.');
      }
      setFormClase({ id: null, nombre: '', tipoRutina: '', recinto: '' });
      await cargarDatos();
    } catch (err) {
      setMensajeError(err.errores?.join(' · ') || err.message);
    }
  }

  async function guardarBloque(e) {
    e.preventDefault();
    limpiarAvisos();
    try {
      const payload = {
        clase: formBloque.clase,
        recinto: formBloque.recinto,
        diaSemana: Number(formBloque.diaSemana),
        horaInicio: formBloque.horaInicio,
        horaFin: formBloque.horaFin,
        capacidad: Number(formBloque.capacidad),
      };

      if (formBloque.id) {
        await bloquesApi.actualizar(formBloque.id, payload);
        setMensajeExito('Bloque de horario actualizado y registrado en auditoría.');
      } else {
        await bloquesApi.crear(payload);
        setMensajeExito('Bloque de disponibilidad publicado correctamente.');
      }
      setFormBloque({
        id: null,
        clase: '',
        recinto: '',
        diaSemana: 1,
        horaInicio: '16:00',
        horaFin: '18:00',
        capacidad: 12,
      });
      await cargarDatos();
    } catch (err) {
      setMensajeError(err.errores?.join(' · ') || err.message);
    }
  }

  function seleccionarBloqueParaEditar(b) {
    limpiarAvisos();
    setFormBloque({
      id: b._id,
      clase: b.clase?._id || b.clase || '',
      recinto: b.recinto?._id || b.recinto || '',
      diaSemana: b.diaSemana,
      horaInicio: b.horaInicio,
      horaFin: b.horaFin,
      capacidad: b.capacidad,
    });
  }

  async function borrarBloque(id) {
    limpiarAvisos();
    try {
      await bloquesApi.eliminar(id);
      setMensajeExito('Bloque eliminado correctamente.');
      await cargarDatos();
    } catch (err) {
      setMensajeError(err.message);
    }
  }

  const bloquesFiltrados = bloques.filter((b) => {
    const idRec = b.recinto?._id || b.recinto;
    if (filtroRecinto && String(idRec) !== String(filtroRecinto)) return false;
    if (filtroDia !== '' && Number(b.diaSemana) !== Number(filtroDia)) return false;
    return true;
  });

  return (
    <main className="min-h-screen bg-[#f7faff] text-[#10233f]">
      <header className="sticky top-0 z-40 border-t-4 border-[#1268e8] bg-white/95 shadow-[0_1px_0_rgba(15,35,63,.08)] backdrop-blur-lg">
        <div className="mx-auto flex min-h-[76px] max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-3 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#1268e8] text-white shadow-lg shadow-blue-200">
              <Icon name="logo" className="h-6 w-6" />
            </span>
            <div>
              <p className="text-lg font-extrabold leading-tight">FitBook</p>
              <p className="text-xs text-slate-400">{usuario?.correo}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-[#1268e8]">
              {rolInfo.nombre}
            </span>
            <button onClick={onSalir} className="secondary-button !px-4 !py-2.5">
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
        <p className="section-kicker">Panel de {rolInfo.nombre}</p>
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          Gestión de Recintos, Clases y Horarios
        </h1>
        <p className="mt-2 max-w-2xl text-base leading-7 text-slate-500">
          {rolInfo.descripcion}
        </p>

        {mensajeExito && (
          <div
            role="status"
            className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700"
          >
            {mensajeExito}
          </div>
        )}

        {mensajeError && (
          <div
            role="alert"
            className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
          >
            {mensajeError}
          </div>
        )}

        {cargando ? (
          <p className="mt-8 text-sm text-slate-400">Cargando información del club...</p>
        ) : (
          <div className="mt-8 space-y-10">
            {/* ===============================================================
                VISTA ADMINISTRADOR: Recintos (HU04/HU05) y Usuarios (HU03)
            =============================================================== */}
            {usuario?.rol === 'administrador' && (
              <div className="grid gap-8 lg:grid-cols-2">
                {/* Gestión de Recintos (ST02.03) */}
                <div className="rounded-[22px] border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-xl font-bold">
                    {formRecinto.id ? 'Editar Recinto (HU05)' : 'Crear Nuevo Recinto (HU04)'}
                  </h2>
                  <p className="mt-1 text-xs text-slate-400">
                    Desactivar un recinto lo oculta para nuevas reservas conservando su historial.
                  </p>

                  <form onSubmit={guardarRecinto} className="mt-4 space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-600">
                        Nombre del recinto
                      </label>
                      <input
                        type="text"
                        required
                        value={formRecinto.nombre}
                        onChange={(e) => setFormRecinto({ ...formRecinto, nombre: e.target.value })}
                        placeholder="Ej. Cancha 1 / Sala Funcional"
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-600">Tipo</label>
                        <input
                          type="text"
                          required
                          value={formRecinto.tipo}
                          onChange={(e) => setFormRecinto({ ...formRecinto, tipo: e.target.value })}
                          placeholder="Fútbol 5, Gimnasio..."
                          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600">
                          Capacidad (personas)
                        </label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={formRecinto.capacidad}
                          onChange={(e) =>
                            setFormRecinto({ ...formRecinto, capacidad: e.target.value })
                          }
                          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button type="submit" className="primary-button !py-2.5 text-sm">
                        {formRecinto.id ? 'Guardar cambios' : 'Crear recinto'}
                      </button>
                      {formRecinto.id && (
                        <button
                          type="button"
                          onClick={() =>
                            setFormRecinto({
                              id: null,
                              nombre: '',
                              tipo: 'Fútbol 5',
                              capacidad: 10,
                              descripcion: '',
                            })
                          }
                          className="secondary-button !py-2.5 text-sm"
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                  </form>

                  <div className="mt-6 divide-y divide-slate-100">
                    {recintos.map((r) => (
                      <div
                        key={r._id}
                        className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
                      >
                        <div>
                          <span className="font-bold">{r.nombre}</span>{' '}
                          <span className="text-xs text-slate-500">
                            ({r.tipo} · Cap: {r.capacidad})
                          </span>
                          <span
                            className={`ml-2 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                              r.activo
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {r.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setFormRecinto({
                                id: r._id,
                                nombre: r.nombre,
                                tipo: r.tipo,
                                capacidad: r.capacidad,
                                descripcion: r.descripcion || '',
                              })
                            }
                            className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold hover:bg-slate-50"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => alternarEstadoRecinto(r)}
                            className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold hover:bg-slate-50"
                          >
                            {r.activo ? 'Desactivar' : 'Activar'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Creación de Usuarios e Instructores (HU03 / ST01.07) */}
                <div className="rounded-[22px] border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-xl font-bold">
                    Crear Usuario o Instructor (HU03)
                  </h2>
                  <p className="mt-1 text-xs text-slate-400">
                    Asigna cuentas con rol instructor, coordinador, cliente o administrador.
                  </p>

                  <form onSubmit={guardarNuevoUsuario} className="mt-4 space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-600">Correo</label>
                      <input
                        type="email"
                        required
                        value={formUsuario.correo}
                        onChange={(e) =>
                          setFormUsuario({ ...formUsuario, correo: e.target.value })
                        }
                        placeholder="nuevo@gym.com"
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-600">
                          Contraseña (mín. 8)
                        </label>
                        <input
                          type="password"
                          required
                          minLength={8}
                          value={formUsuario.password}
                          onChange={(e) =>
                            setFormUsuario({ ...formUsuario, password: e.target.value })
                          }
                          placeholder="••••••••"
                          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600">Rol</label>
                        <select
                          value={formUsuario.rol}
                          onChange={(e) =>
                            setFormUsuario({ ...formUsuario, rol: e.target.value })
                          }
                          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        >
                          <option value="instructor">Instructor</option>
                          <option value="coordinador">Coordinador</option>
                          <option value="cliente">Cliente</option>
                          <option value="administrador">Administrador</option>
                        </select>
                      </div>
                    </div>
                    <button type="submit" className="primary-button !py-2.5 text-sm">
                      Crear cuenta con rol
                    </button>
                  </form>

                  <div className="mt-6 max-h-56 divide-y divide-slate-100 overflow-y-auto">
                    {usuarios.map((u) => (
                      <div
                        key={u._id}
                        className="flex items-center justify-between py-2.5 text-sm"
                      >
                        <span className="font-medium">{u.correo}</span>
                        <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-[#1268e8]">
                          {u.rol}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ===============================================================
                VISTA INSTRUCTOR: Clases (HU06) y Bloques Propios (HU07/HU08)
            =============================================================== */}
            {usuario?.rol === 'instructor' && (
              <div className="grid gap-8 lg:grid-cols-2">
                {/* Mis Clases (HU06) */}
                <div className="rounded-[22px] border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-xl font-bold">
                    {formClase.id ? 'Editar Mi Clase (HU06)' : 'Crear Nueva Clase (HU06)'}
                  </h2>
                  <p className="mt-1 text-xs text-slate-400">
                    Solo se pueden asociar clases a recintos activos.
                  </p>

                  <form onSubmit={guardarClase} className="mt-4 space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-600">
                        Nombre de la clase
                      </label>
                      <input
                        type="text"
                        required
                        value={formClase.nombre}
                        onChange={(e) => setFormClase({ ...formClase, nombre: e.target.value })}
                        placeholder="Ej. Entrenamiento funcional"
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600">
                        Tipo de rutina
                      </label>
                      <input
                        type="text"
                        required
                        value={formClase.tipoRutina}
                        onChange={(e) =>
                          setFormClase({ ...formClase, tipoRutina: e.target.value })
                        }
                        placeholder="Ej. Fuerza y cardio"
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600">
                        Recinto activo
                      </label>
                      <select
                        required
                        value={formClase.recinto}
                        onChange={(e) =>
                          setFormClase({ ...formClase, recinto: e.target.value })
                        }
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      >
                        <option value="">Selecciona un recinto activo...</option>
                        {recintosActivos.map((r) => (
                          <option key={r._id} value={r._id}>
                            {r.nombre} ({r.tipo} · Cap: {r.capacidad})
                          </option>
                        ))}
                      </select>
                    </div>
                    <button type="submit" className="primary-button !py-2.5 text-sm">
                      {formClase.id ? 'Actualizar clase' : 'Crear clase'}
                    </button>
                  </form>

                  <div className="mt-6 divide-y divide-slate-100">
                    {clases.map((c) => (
                      <div
                        key={c._id}
                        className="flex items-center justify-between py-3 text-sm"
                      >
                        <div>
                          <p className="font-bold">{c.nombre}</p>
                          <p className="text-xs text-slate-500">
                            Rutina: {c.tipoRutina} · Recinto:{' '}
                            {c.recinto?.nombre || 'Asignado'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setFormClase({
                              id: c._id,
                              nombre: c.nombre,
                              tipoRutina: c.tipoRutina,
                              recinto: c.recinto?._id || c.recinto || '',
                            })
                          }
                          className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold hover:bg-slate-50"
                        >
                          Editar
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Publicar / Actualizar Bloques de Disponibilidad (HU07, HU08, ST02.08) */}
                <div className="rounded-[22px] border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-xl font-bold">
                    {formBloque.id
                      ? 'Actualizar Bloque de Horario (HU08)'
                      : 'Publicar Bloque de Disponibilidad (HU07)'}
                  </h2>
                  <p className="mt-1 text-xs text-slate-400">
                    Valida automáticamente que la hora fin sea posterior al inicio y que no haya solapamientos.
                  </p>

                  <form onSubmit={guardarBloque} className="mt-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-600">Clase</label>
                        <select
                          required
                          value={formBloque.clase}
                          onChange={(e) => {
                            const cl = clases.find((x) => x._id === e.target.value);
                            setFormBloque({
                              ...formBloque,
                              clase: e.target.value,
                              recinto: cl?.recinto?._id || cl?.recinto || formBloque.recinto,
                            });
                          }}
                          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        >
                          <option value="">Selecciona clase...</option>
                          {clases.map((c) => (
                            <option key={c._id} value={c._id}>
                              {c.nombre}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600">Recinto</label>
                        <select
                          required
                          value={formBloque.recinto}
                          onChange={(e) =>
                            setFormBloque({ ...formBloque, recinto: e.target.value })
                          }
                          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        >
                          <option value="">Selecciona recinto...</option>
                          {recintosActivos.map((r) => (
                            <option key={r._id} value={r._id}>
                              {r.nombre}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-600">Día</label>
                        <select
                          value={formBloque.diaSemana}
                          onChange={(e) =>
                            setFormBloque({ ...formBloque, diaSemana: Number(e.target.value) })
                          }
                          className="mt-1 w-full rounded-xl border border-slate-200 px-2 py-2 text-sm"
                        >
                          {DIAS_SEMANA.map((d) => (
                            <option key={d.valor} value={d.valor}>
                              {d.etiqueta}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600">Inicio</label>
                        <input
                          type="time"
                          required
                          value={formBloque.horaInicio}
                          onChange={(e) =>
                            setFormBloque({ ...formBloque, horaInicio: e.target.value })
                          }
                          className="mt-1 w-full rounded-xl border border-slate-200 px-2 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600">Fin</label>
                        <input
                          type="time"
                          required
                          value={formBloque.horaFin}
                          onChange={(e) =>
                            setFormBloque({ ...formBloque, horaFin: e.target.value })
                          }
                          className="mt-1 w-full rounded-xl border border-slate-200 px-2 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600">Cupos</label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={formBloque.capacidad}
                          onChange={(e) =>
                            setFormBloque({ ...formBloque, capacidad: e.target.value })
                          }
                          className="mt-1 w-full rounded-xl border border-slate-200 px-2 py-2 text-sm"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button type="submit" className="primary-button !py-2.5 text-sm">
                        {formBloque.id ? 'Guardar bloque' : 'Registrar bloque'}
                      </button>
                      {formBloque.id && (
                        <button
                          type="button"
                          onClick={() =>
                            setFormBloque({
                              id: null,
                              clase: '',
                              recinto: '',
                              diaSemana: 1,
                              horaInicio: '16:00',
                              horaFin: '18:00',
                              capacidad: 12,
                            })
                          }
                          className="secondary-button !py-2.5 text-sm"
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* ===============================================================
                VISTA COORDINADOR / ADMIN: Edición de bloques (HU09, ST02.09)
            =============================================================== */}
            {(usuario?.rol === 'coordinador' || usuario?.rol === 'administrador') &&
              formBloque.id && (
                <div className="rounded-[22px] border border-blue-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold">
                    Edición Operativa de Bloque de Horario (HU09 · Auditoría Activa)
                  </h2>
                  <form onSubmit={guardarBloque} className="mt-4 grid gap-3 sm:grid-cols-5">
                    <select
                      value={formBloque.diaSemana}
                      onChange={(e) =>
                        setFormBloque({ ...formBloque, diaSemana: Number(e.target.value) })
                      }
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    >
                      {DIAS_SEMANA.map((d) => (
                        <option key={d.valor} value={d.valor}>
                          {d.etiqueta}
                        </option>
                      ))}
                    </select>
                    <input
                      type="time"
                      value={formBloque.horaInicio}
                      onChange={(e) =>
                        setFormBloque({ ...formBloque, horaInicio: e.target.value })
                      }
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    />
                    <input
                      type="time"
                      value={formBloque.horaFin}
                      onChange={(e) =>
                        setFormBloque({ ...formBloque, horaFin: e.target.value })
                      }
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    />
                    <input
                      type="number"
                      min="1"
                      value={formBloque.capacidad}
                      onChange={(e) =>
                        setFormBloque({ ...formBloque, capacidad: e.target.value })
                      }
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    />
                    <div className="flex gap-2">
                      <button type="submit" className="primary-button !py-2 text-xs">
                        Guardar
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormBloque({ ...formBloque, id: null })}
                        className="secondary-button !py-2 text-xs"
                      >
                        Cerrar
                      </button>
                    </div>
                  </form>
                </div>
              )}

            {/* ===============================================================
                TABLA GENERAL DE HORARIOS Y RECINTOS (Todos los roles:
                ST02.08, ST02.09 Coordinador, ST02.10 Vista Cliente)
            =============================================================== */}
            <div className="rounded-[22px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold">
                    {usuario?.rol === 'cliente'
                      ? 'Mis Recintos y Horarios Disponibles (ST02.10)'
                      : 'Horarios y Bloques de Disponibilidad por Recinto (HU07–HU09)'}
                  </h2>
                  <p className="mt-1 text-xs text-slate-400">
                    Filtra por recinto o día de la semana para consultar la programación vigente.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <select
                    value={filtroRecinto}
                    onChange={(e) => setFiltroRecinto(e.target.value)}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold"
                  >
                    <option value="">Todos los recintos</option>
                    {(usuario?.rol === 'cliente' ? recintosActivos : recintos).map((r) => (
                      <option key={r._id} value={r._id}>
                        {r.nombre}
                      </option>
                    ))}
                  </select>

                  <select
                    value={filtroDia}
                    onChange={(e) => setFiltroDia(e.target.value)}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold"
                  >
                    <option value="">Todos los días</option>
                    {DIAS_SEMANA.map((d) => (
                      <option key={d.valor} value={d.valor}>
                        {d.etiqueta}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {bloquesFiltrados.length === 0 ? (
                <p className="mt-6 text-sm text-slate-400">
                  No hay bloques registrados para los filtros seleccionados.
                </p>
              ) : (
                <div className="mt-6 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-xs uppercase text-slate-400">
                        <th className="pb-3 pr-4">Día y Horario</th>
                        <th className="pb-3 pr-4">Clase / Rutina</th>
                        <th className="pb-3 pr-4">Recinto</th>
                        <th className="pb-3 pr-4">Instructor</th>
                        <th className="pb-3 pr-4">Capacidad</th>
                        <th className="pb-3 pr-4">Auditoría</th>
                        {usuario?.rol !== 'cliente' && <th className="pb-3">Acciones</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {bloquesFiltrados.map((b) => (
                        <tr key={b._id}>
                          <td className="py-3 pr-4 font-bold">
                            {nombreDia(b.diaSemana)} · {b.horaInicio} – {b.horaFin}
                          </td>
                          <td className="py-3 pr-4">
                            <span className="font-semibold">
                              {b.clase?.nombre || 'Clase'}
                            </span>
                            {b.clase?.tipoRutina && (
                              <span className="block text-xs text-slate-400">
                                {b.clase.tipoRutina}
                              </span>
                            )}
                          </td>
                          <td className="py-3 pr-4">
                            {b.recinto?.nombre || 'Recinto'}
                          </td>
                          <td className="py-3 pr-4 text-xs text-slate-600">
                            {b.instructor?.correo || 'Instructor'}
                          </td>
                          <td className="py-3 pr-4">
                            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-[#1268e8]">
                              {b.capacidad} cupos
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-xs text-slate-400">
                            {b.modificadoPor?.correo
                              ? `Por ${b.modificadoPor.correo}`
                              : 'Registro original'}
                          </td>
                          {usuario?.rol !== 'cliente' && (
                            <td className="py-3">
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => seleccionarBloqueParaEditar(b)}
                                  className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold hover:bg-slate-50"
                                >
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => borrarBloque(b._id)}
                                  className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                                >
                                  Eliminar
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-10 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-700">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-500 text-white">
            <Icon name="check" className="h-4 w-4" />
          </span>
          Sprints 1 y 2 activos: Autenticación, Roles, Recintos, Clases y Bloques de Disponibilidad (HU01 a HU09).
        </div>
      </section>
    </main>
  );
}
