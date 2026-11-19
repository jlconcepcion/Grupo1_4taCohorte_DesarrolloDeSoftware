import { useEffect, useState } from 'react';
import Icon from '../components/Icon.jsx';
import {
  usuariosApi,
  recintosApi,
  clasesApi,
  bloquesApi,
  reservasApi,
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

/**
 * Calcula la próxima fecha YYYY-MM-DD (a partir de mañana) que cae en el día de la semana indicado (0=Dom..6=Sab).
 */
function proximaFechaParaDia(diaSemanaObjetivo) {
  const hoy = new Date();
  const candidato = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1);
  for (let i = 0; i < 7; i += 1) {
    if (candidato.getDay() === Number(diaSemanaObjetivo)) {
      const yyyy = candidato.getFullYear();
      const mm = String(candidato.getMonth() + 1).padStart(2, '0');
      const dd = String(candidato.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
    candidato.setDate(candidato.getDate() + 1);
  }
  return '';
}

const REGISTROS_POR_PAGINA = 5;

function Paginacion({ etiqueta, pagina, totalPaginas, totalRegistros, onCambiar }) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-xs text-slate-500">
      <span>
        {etiqueta}: {totalRegistros} registros · página {pagina} de {totalPaginas}
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onCambiar(pagina - 1)}
          disabled={pagina <= 1}
          className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Anterior
        </button>
        <button
          type="button"
          onClick={() => onCambiar(pagina + 1)}
          disabled={pagina >= totalPaginas}
          className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}

function BadgeEstadoReserva({ estado }) {
  const estilos = {
    pendiente: 'bg-amber-50 text-amber-700 border-amber-200',
    confirmada: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    cancelada: 'bg-slate-100 text-slate-500 border-slate-200',
  };
  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase ${
        estilos[estado] || estilos.pendiente
      }`}
    >
      {estado}
    </span>
  );
}

const ROLES_META = {
  cliente: {
    nombre: 'Cliente',
    icono: 'calendar',
    descripcion:
      'Consulta disponibilidad en tiempo real, reserva tu cupo, confirma tu asistencia hasta 1 hora antes o cancela cuando no puedas asistir.',
  },
  instructor: {
    nombre: 'Instructor',
    icono: 'users',
    descripcion:
      'Crea tus clases en recintos activos, publica bloques de disponibilidad y consulta cuántas personas reservaron y confirmaron cada horario.',
  },
  coordinador: {
    nombre: 'Coordinador',
    icono: 'activity',
    descripcion:
      'Filtra y supervisa las reservas de los clientes, confirma asistencias o cancela reservas no confirmadas para liberar cupos, y administra horarios.',
  },
  administrador: {
    nombre: 'Administrador',
    icono: 'target',
    descripcion:
      'Gestiona recintos, cuentas de usuarios/instructores, horarios y administra o reasigna cualquier reserva del sistema.',
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
  const [disponibilidad, setDisponibilidad] = useState([]);
  const [misReservas, setMisReservas] = useState([]);
  const [todasReservas, setTodasReservas] = useState([]);
  const [conteosInstructor, setConteosInstructor] = useState([]);

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

  // Filtros de consulta por recinto y día (Horarios generales)
  const [filtroRecinto, setFiltroRecinto] = useState('');
  const [filtroDia, setFiltroDia] = useState('');

  // Filtros de Disponibilidad y Mis Reservas para el Cliente (HU10, HU11, HU13)
  const [vistaCliente, setVistaCliente] = useState('disponibilidad');
  const [filtroDispFecha, setFiltroDispFecha] = useState('');
  const [filtroDispRecinto, setFiltroDispRecinto] = useState('');
  const [filtroDispClase, setFiltroDispClase] = useState('');
  const [filtroTipoMisReservas, setFiltroTipoMisReservas] = useState('todas');

  // Filtros del Panel de Reservas para Coordinador y Administrador (HU15 - HU17, ST03.07)
  const [filtroResFecha, setFiltroResFecha] = useState('');
  const [filtroResRecinto, setFiltroResRecinto] = useState('');
  const [filtroResEstado, setFiltroResEstado] = useState('');
  const [motivoCancelacionCoord, setMotivoCancelacionCoord] = useState('');

  // Formulario de Reasignación de Reserva exclusiva del Administrador (ST03.10)
  const [formReasignar, setFormReasignar] = useState({
    reservaId: null,
    nuevoBloqueId: '',
    nuevaFecha: '',
  });

  // Navegación y paginación del panel administrador
  const [vistaAdmin, setVistaAdmin] = useState('recintos');
  const [paginaRecintos, setPaginaRecintos] = useState(1);
  const [paginaUsuarios, setPaginaUsuarios] = useState(1);

  function limpiarAvisos() {
    setMensajeExito('');
    setMensajeError('');
  }

  async function cargarDatos() {
    setCargando(true);
    try {
      const esCliente = usuario?.rol === 'cliente';
      const esInstructor = usuario?.rol === 'instructor';
      const esCoordinador = usuario?.rol === 'coordinador';
      const esAdmin = usuario?.rol === 'administrador';

      const [listaRecintos, listaClases, listaBloques] = await Promise.all([
        recintosApi.listar(esCliente),
        clasesApi.listar(esInstructor ? { propias: 'true' } : {}),
        bloquesApi.listar(esInstructor ? { propios: 'true' } : {}),
      ]);

      setRecintos(Array.isArray(listaRecintos) ? listaRecintos : []);
      setClases(Array.isArray(listaClases) ? listaClases : []);
      setBloques(Array.isArray(listaBloques) ? listaBloques : []);

      if (esCliente) {
        const [disp, mias] = await Promise.all([
          reservasApi
            .disponibilidad({
              fecha: filtroDispFecha,
              recinto: filtroDispRecinto,
              clase: filtroDispClase,
            })
            .catch(() => []),
          reservasApi.mias(filtroTipoMisReservas).catch(() => []),
        ]);
        setDisponibilidad(Array.isArray(disp) ? disp : []);
        setMisReservas(Array.isArray(mias) ? mias : []);
      }

      if (esInstructor) {
        const conteo = await reservasApi.conteoInstructor().catch(() => []);
        setConteosInstructor(Array.isArray(conteo) ? conteo : []);
      }

      if (esCoordinador || esAdmin) {
        const reservasSistema = await reservasApi
          .listarTodas({
            fecha: filtroResFecha,
            recinto: filtroResRecinto,
            estado: filtroResEstado,
          })
          .catch(() => []);
        setTodasReservas(Array.isArray(reservasSistema) ? reservasSistema : []);
      }

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
  }, [
    usuario?.rol,
    filtroDispFecha,
    filtroDispRecinto,
    filtroDispClase,
    filtroTipoMisReservas,
    filtroResFecha,
    filtroResRecinto,
    filtroResEstado,
  ]);

  const recintosActivos = recintos.filter((r) => r.activo !== false);

  const totalPaginasRecintos = Math.max(
    1,
    Math.ceil(recintos.length / REGISTROS_POR_PAGINA)
  );
  const paginaRecintosActual = Math.min(paginaRecintos, totalPaginasRecintos);
  const recintosPagina = recintos.slice(
    (paginaRecintosActual - 1) * REGISTROS_POR_PAGINA,
    paginaRecintosActual * REGISTROS_POR_PAGINA
  );

  const totalPaginasUsuarios = Math.max(
    1,
    Math.ceil(usuarios.length / REGISTROS_POR_PAGINA)
  );
  const paginaUsuariosActual = Math.min(paginaUsuarios, totalPaginasUsuarios);
  const usuariosPagina = usuarios.slice(
    (paginaUsuariosActual - 1) * REGISTROS_POR_PAGINA,
    paginaUsuariosActual * REGISTROS_POR_PAGINA
  );

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

  // ===========================================================================
  // Acciones Sprint 3 · Reservas (Cliente: HU11, HU12, HU14 · Coord/Admin: HU16, HU17, ST03.10)
  // ===========================================================================
  async function reservarCupoCliente(itemDisp) {
    limpiarAvisos();
    try {
      const fechaObjetivo =
        filtroDispFecha || itemDisp.fecha || proximaFechaParaDia(itemDisp.diaSemana);
      await reservasApi.crear({
        bloqueId: itemDisp._id || itemDisp.bloqueId,
        fecha: fechaObjetivo,
      });
      setMensajeExito(
        `¡Cupo reservado para el ${fechaObjetivo} (${itemDisp.horaInicio}–${itemDisp.horaFin}) en estado PENDIENTE!`
      );
      await cargarDatos();
    } catch (err) {
      setMensajeError(err.message);
    }
  }

  async function confirmarMiReserva(id) {
    limpiarAvisos();
    try {
      await reservasApi.confirmarAsistencia(id);
      setMensajeExito('Asistencia confirmada correctamente.');
      await cargarDatos();
    } catch (err) {
      setMensajeError(err.message);
    }
  }

  async function cancelarMiReserva(id) {
    limpiarAvisos();
    try {
      await reservasApi.cancelarPropia(id);
      setMensajeExito('Reserva cancelada. Tu cupo ha sido liberado.');
      await cargarDatos();
    } catch (err) {
      setMensajeError(err.message);
    }
  }

  async function confirmarPorCoordinador(id) {
    limpiarAvisos();
    try {
      await reservasApi.confirmarCoordinador(id);
      setMensajeExito('Reserva confirmada por coordinación.');
      await cargarDatos();
    } catch (err) {
      setMensajeError(err.message);
    }
  }

  async function cancelarPorCoordinador(id) {
    limpiarAvisos();
    try {
      await reservasApi.cancelarCoordinador(id, motivoCancelacionCoord);
      setMensajeExito('Reserva cancelada y cupo liberado para otros clientes.');
      setMotivoCancelacionCoord('');
      await cargarDatos();
    } catch (err) {
      setMensajeError(err.message);
    }
  }

  async function guardarReasignacionAdmin(e) {
    e.preventDefault();
    limpiarAvisos();
    try {
      await reservasApi.reasignarAdmin(formReasignar.reservaId, {
        nuevoBloqueId: formReasignar.nuevoBloqueId,
        nuevaFecha: formReasignar.nuevaFecha,
      });
      setMensajeExito('Reserva reasignada exitosamente por el administrador.');
      setFormReasignar({ reservaId: null, nuevoBloqueId: '', nuevaFecha: '' });
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
          Gestión de Recintos, Horarios y Reservas
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
                VISTA CLIENTE: Disponibilidad, Reserva y Mis Reservas (HU10-HU14)
            =============================================================== */}
            {usuario?.rol === 'cliente' && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center gap-2 rounded-[22px] border border-slate-200 bg-white p-2 shadow-sm">
                  <button
                    type="button"
                    onClick={() => setVistaCliente('disponibilidad')}
                    className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                      vistaCliente === 'disponibilidad'
                        ? 'bg-[#1268e8] text-white shadow-sm'
                        : 'text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    Buscar Disponibilidad y Reservar ({disponibilidad.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setVistaCliente('mis-reservas')}
                    className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                      vistaCliente === 'mis-reservas'
                        ? 'bg-[#1268e8] text-white shadow-sm'
                        : 'text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    Mis Reservas ({misReservas.length})
                  </button>
                </div>

                {vistaCliente === 'disponibilidad' && (
                  <div className="rounded-[22px] border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-bold">
                          Horarios Disponibles con Cupos Libres (HU10 · HU11)
                        </h2>
                        <p className="mt-1 text-xs text-slate-400">
                          Filtra por fecha, recinto activo o clase y solicita tu cupo en línea.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <input
                          type="date"
                          value={filtroDispFecha}
                          onChange={(e) => setFiltroDispFecha(e.target.value)}
                          className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold"
                        />
                        <select
                          value={filtroDispRecinto}
                          onChange={(e) => setFiltroDispRecinto(e.target.value)}
                          className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold"
                        >
                          <option value="">Todos los recintos activos</option>
                          {recintosActivos.map((r) => (
                            <option key={r._id} value={r._id}>
                              {r.nombre}
                            </option>
                          ))}
                        </select>
                        <select
                          value={filtroDispClase}
                          onChange={(e) => setFiltroDispClase(e.target.value)}
                          className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold"
                        >
                          <option value="">Todas las clases</option>
                          {clases.map((c) => (
                            <option key={c._id} value={c._id}>
                              {c.nombre}
                            </option>
                          ))}
                        </select>
                        {(filtroDispFecha || filtroDispRecinto || filtroDispClase) && (
                          <button
                            type="button"
                            onClick={() => {
                              setFiltroDispFecha('');
                              setFiltroDispRecinto('');
                              setFiltroDispClase('');
                            }}
                            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50"
                          >
                            Limpiar filtros
                          </button>
                        )}
                      </div>
                    </div>

                    {disponibilidad.length === 0 ? (
                      <p className="mt-6 text-sm text-slate-400">
                        No hay horarios con cupos libres para los filtros seleccionados.
                      </p>
                    ) : (
                      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {disponibilidad.map((item) => {
                          const fechaReserva =
                            filtroDispFecha ||
                            item.fecha ||
                            proximaFechaParaDia(item.diaSemana);
                          return (
                            <article
                              key={item._id}
                              className="flex flex-col justify-between rounded-2xl border border-slate-200 p-5 transition hover:border-blue-200 hover:shadow-md"
                            >
                              <div>
                                <div className="flex items-center justify-between gap-2">
                                  <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-[#1268e8]">
                                    {nombreDia(item.diaSemana)} · {item.horaInicio} – {item.horaFin}
                                  </span>
                                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                                    {item.cuposLibres} de {item.capacidad} libres
                                  </span>
                                </div>
                                <h3 className="mt-3 text-base font-bold">
                                  {item.clase?.nombre || 'Clase / Cancha'}
                                </h3>
                                <p className="text-xs text-slate-500">
                                  Recinto: <strong>{item.recinto?.nombre || 'Recinto'}</strong>
                                </p>
                                <p className="text-xs text-slate-500">
                                  Instructor: {item.instructor?.correo || 'Instructor asignado'}
                                </p>
                                <p className="mt-2 text-xs font-semibold text-slate-600">
                                  Fecha a reservar: <code>{fechaReserva}</code>
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() => reservarCupoCliente(item)}
                                className="primary-button mt-4 w-full !py-2.5 text-xs"
                              >
                                Reservar cupo
                              </button>
                            </article>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {vistaCliente === 'mis-reservas' && (
                  <div className="rounded-[22px] border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-bold">
                          Mis Reservas (HU12 · HU13 · HU14)
                        </h2>
                        <p className="mt-1 text-xs text-slate-400">
                          Confirma tu asistencia hasta 1 hora antes del inicio o cancela para liberar tu cupo.
                        </p>
                      </div>

                      <div className="flex gap-2">
                        {[
                          { id: 'todas', label: 'Todas' },
                          { id: 'proximas', label: 'Próximas' },
                          { id: 'pasadas', label: 'Pasadas' },
                        ].map((tab) => (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setFiltroTipoMisReservas(tab.id)}
                            className={`rounded-xl px-3 py-1.5 text-xs font-bold ${
                              filtroTipoMisReservas === tab.id
                                ? 'bg-[#1268e8] text-white'
                                : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {misReservas.length === 0 ? (
                      <p className="mt-6 text-sm text-slate-400">
                        No tienes reservas registradas en esta categoría.
                      </p>
                    ) : (
                      <div className="mt-6 overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead>
                            <tr className="border-b border-slate-100 text-xs uppercase text-slate-400">
                              <th className="pb-3 pr-4">Fecha y Horario</th>
                              <th className="pb-3 pr-4">Recinto</th>
                              <th className="pb-3 pr-4">Clase</th>
                              <th className="pb-3 pr-4">Instructor</th>
                              <th className="pb-3 pr-4">Estado</th>
                              <th className="pb-3">Acciones</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {misReservas.map((r) => (
                              <tr key={r._id}>
                                <td className="py-3 pr-4 font-bold">
                                  {r.fecha} · {r.bloque?.horaInicio || '--:--'} –{' '}
                                  {r.bloque?.horaFin || '--:--'}
                                </td>
                                <td className="py-3 pr-4">{r.recinto?.nombre || 'Recinto'}</td>
                                <td className="py-3 pr-4">{r.clase?.nombre || 'Clase'}</td>
                                <td className="py-3 pr-4 text-xs text-slate-600">
                                  {r.bloque?.instructor?.correo || 'Instructor'}
                                </td>
                                <td className="py-3 pr-4">
                                  <BadgeEstadoReserva estado={r.estado} />
                                </td>
                                <td className="py-3">
                                  {r.estado !== 'cancelada' && !r.esPasada && (
                                    <div className="flex flex-wrap gap-2">
                                      {r.estado === 'pendiente' && (
                                        <button
                                          type="button"
                                          onClick={() => confirmarMiReserva(r._id)}
                                          className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                                        >
                                          Confirmar asistencia
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => cancelarMiReserva(r._id)}
                                        className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                                      >
                                        Cancelar cupo
                                      </button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ===============================================================
                VISTA ADMINISTRADOR: Recintos, Usuarios y Reservas
            =============================================================== */}
            {usuario?.rol === 'administrador' && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center gap-2 rounded-[22px] border border-slate-200 bg-white p-2 shadow-sm">
                  <button
                    type="button"
                    onClick={() => setVistaAdmin('recintos')}
                    className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                      vistaAdmin === 'recintos'
                        ? 'bg-[#1268e8] text-white shadow-sm'
                        : 'text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    Recintos ({recintos.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setVistaAdmin('usuarios')}
                    className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                      vistaAdmin === 'usuarios'
                        ? 'bg-[#1268e8] text-white shadow-sm'
                        : 'text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    Usuarios ({usuarios.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setVistaAdmin('reservas')}
                    className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                      vistaAdmin === 'reservas'
                        ? 'bg-[#1268e8] text-white shadow-sm'
                        : 'text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    Reservas ({todasReservas.length})
                  </button>
                </div>

                {vistaAdmin === 'recintos' && (
                  <div className="space-y-6">
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
                            onChange={(e) =>
                              setFormRecinto({ ...formRecinto, nombre: e.target.value })
                            }
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
                              onChange={(e) =>
                                setFormRecinto({ ...formRecinto, tipo: e.target.value })
                              }
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
                    </div>

                    <div className="rounded-[22px] border border-slate-200 bg-white p-6 shadow-sm">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h2 className="text-xl font-bold">Listado de recintos</h2>
                          <p className="mt-1 text-xs text-slate-400">
                            Consulta, edita o cambia el estado de los recintos registrados.
                          </p>
                        </div>
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-[#1268e8]">
                          {recintos.length} en total
                        </span>
                      </div>

                      <div className="mt-4 divide-y divide-slate-100">
                        {recintosPagina.map((r) => (
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

                      <Paginacion
                        etiqueta="Recintos"
                        pagina={paginaRecintosActual}
                        totalPaginas={totalPaginasRecintos}
                        totalRegistros={recintos.length}
                        onCambiar={setPaginaRecintos}
                      />
                    </div>
                  </div>
                )}

                {vistaAdmin === 'usuarios' && (
                  <div className="space-y-6">
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
                    </div>

                    <div className="rounded-[22px] border border-slate-200 bg-white p-6 shadow-sm">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h2 className="text-xl font-bold">Listado de usuarios</h2>
                          <p className="mt-1 text-xs text-slate-400">
                            Consulta las cuentas registradas y su rol asignado.
                          </p>
                        </div>
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-[#1268e8]">
                          {usuarios.length} en total
                        </span>
                      </div>

                      <div className="mt-4 divide-y divide-slate-100">
                        {usuariosPagina.map((u) => (
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

                      <Paginacion
                        etiqueta="Usuarios"
                        pagina={paginaUsuariosActual}
                        totalPaginas={totalPaginasUsuarios}
                        totalRegistros={usuarios.length}
                        onCambiar={setPaginaUsuarios}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ===============================================================
                VISTA INSTRUCTOR: Clases (HU06), Bloques (HU07/HU08) y Conteo (ST03.09)
            =============================================================== */}
            {usuario?.rol === 'instructor' && (
              <div className="space-y-8">
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

                {/* Conteo de Reservas y Confirmadas por Clase y Horario (ST03.09) */}
                <div className="rounded-[22px] border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-xl font-bold">
                    Conteo de Reservas y Confirmaciones por Clase y Horario (ST03.09)
                  </h2>
                  <p className="mt-1 text-xs text-slate-400">
                    Resumen actualizado de cupos reservados, confirmados y pendientes en cada uno de tus bloques.
                  </p>

                  {conteosInstructor.length === 0 ? (
                    <p className="mt-4 text-sm text-slate-400">
                      Aún no tienes bloques con reservas registradas.
                    </p>
                  ) : (
                    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {conteosInstructor.map((c) => (
                        <article
                          key={c.bloqueId}
                          className="rounded-2xl border border-slate-200 p-4"
                        >
                          <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-[#1268e8]">
                            {nombreDia(c.diaSemana)} · {c.horaInicio} – {c.horaFin}
                          </span>
                          <h3 className="mt-2 font-bold">
                            {c.clase?.nombre || 'Clase'}
                          </h3>
                          <p className="text-xs text-slate-500">
                            Recinto: {c.recinto?.nombre || 'Recinto'}
                          </p>
                          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                            <div className="rounded-xl bg-slate-50 p-2">
                              <span className="block text-base font-extrabold text-slate-800">
                                {c.totalReservadas}
                              </span>
                              Reservadas
                            </div>
                            <div className="rounded-xl bg-emerald-50 p-2 text-emerald-700">
                              <span className="block text-base font-extrabold">
                                {c.confirmadas}
                              </span>
                              Confirmadas
                            </div>
                            <div className="rounded-xl bg-amber-50 p-2 text-amber-700">
                              <span className="block text-base font-extrabold">
                                {c.pendientes}
                              </span>
                              Pendientes
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ===============================================================
                PANEL DE CONTROL DE RESERVAS PARA COORDINADOR Y ADMIN
                (HU15, HU16, HU17, ST03.07, ST03.08, ST03.10)
            =============================================================== */}
            {(usuario?.rol === 'coordinador' ||
              (usuario?.rol === 'administrador' && vistaAdmin === 'reservas')) && (
              <div className="rounded-[22px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold">
                      Panel de Control de Reservas (HU15 · HU16 · HU17)
                    </h2>
                    <p className="mt-1 text-xs text-slate-400">
                      Filtra por fecha, recinto y estado para confirmar asistencias o cancelar reservas no confirmadas y liberar cupos.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      type="date"
                      value={filtroResFecha}
                      onChange={(e) => setFiltroResFecha(e.target.value)}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold"
                    />
                    <select
                      value={filtroResRecinto}
                      onChange={(e) => setFiltroResRecinto(e.target.value)}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold"
                    >
                      <option value="">Todos los recintos</option>
                      {recintos.map((r) => (
                        <option key={r._id} value={r._id}>
                          {r.nombre}
                        </option>
                      ))}
                    </select>
                    <select
                      value={filtroResEstado}
                      onChange={(e) => setFiltroResEstado(e.target.value)}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold"
                    >
                      <option value="">Todos los estados</option>
                      <option value="pendiente">Pendientes</option>
                      <option value="confirmada">Confirmadas</option>
                      <option value="cancelada">Canceladas</option>
                    </select>
                    <input
                      type="text"
                      value={motivoCancelacionCoord}
                      onChange={(e) => setMotivoCancelacionCoord(e.target.value)}
                      placeholder="Motivo opcional al cancelar..."
                      className="rounded-xl border border-slate-200 px-3 py-2 text-xs"
                    />
                  </div>
                </div>

                {/* Formulario en línea para Reasignación exclusiva de Administrador (ST03.10) */}
                {usuario?.rol === 'administrador' && formReasignar.reservaId && (
                  <form
                    onSubmit={guardarReasignacionAdmin}
                    className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50/50 p-4"
                  >
                    <span className="text-xs font-bold text-[#1268e8]">
                      Reasignar reserva (ST03.10):
                    </span>
                    <select
                      required
                      value={formReasignar.nuevoBloqueId}
                      onChange={(e) =>
                        setFormReasignar({ ...formReasignar, nuevoBloqueId: e.target.value })
                      }
                      className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs"
                    >
                      <option value="">Selecciona nuevo bloque...</option>
                      {bloques.map((b) => (
                        <option key={b._id} value={b._id}>
                          {nombreDia(b.diaSemana)} {b.horaInicio}-{b.horaFin} ({b.recinto?.nombre})
                        </option>
                      ))}
                    </select>
                    <input
                      type="date"
                      required
                      value={formReasignar.nuevaFecha}
                      onChange={(e) =>
                        setFormReasignar({ ...formReasignar, nuevaFecha: e.target.value })
                      }
                      className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs"
                    />
                    <button type="submit" className="primary-button !py-1.5 text-xs">
                      Guardar reasignación
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setFormReasignar({ reservaId: null, nuevoBloqueId: '', nuevaFecha: '' })
                      }
                      className="secondary-button !py-1.5 text-xs"
                    >
                      Cancelar
                    </button>
                  </form>
                )}

                {todasReservas.length === 0 ? (
                  <p className="mt-6 text-sm text-slate-400">
                    No se encontraron reservas para los filtros seleccionados.
                  </p>
                ) : (
                  <div className="mt-6 overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 text-xs uppercase text-slate-400">
                          <th className="pb-3 pr-4">Cliente</th>
                          <th className="pb-3 pr-4">Fecha y Horario</th>
                          <th className="pb-3 pr-4">Recinto / Clase</th>
                          <th className="pb-3 pr-4">Estado</th>
                          <th className="pb-3 pr-4">Gestión / Motivo</th>
                          <th className="pb-3">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {todasReservas.map((r) => (
                          <tr key={r._id}>
                            <td className="py-3 pr-4 font-semibold">
                              {r.cliente?.correo || 'Cliente'}
                            </td>
                            <td className="py-3 pr-4 font-bold">
                              {r.fecha} · {r.bloque?.horaInicio || '--:--'} –{' '}
                              {r.bloque?.horaFin || '--:--'}
                            </td>
                            <td className="py-3 pr-4">
                              <span>{r.recinto?.nombre || 'Recinto'}</span>
                              {r.clase?.nombre && (
                                <span className="block text-xs text-slate-400">
                                  {r.clase.nombre}
                                </span>
                              )}
                            </td>
                            <td className="py-3 pr-4">
                              <BadgeEstadoReserva estado={r.estado} />
                            </td>
                            <td className="py-3 pr-4 text-xs text-slate-500">
                              {r.gestionadoPor?.correo
                                ? `Por ${r.gestionadoPor.correo}`
                                : 'Sin cambios'}
                              {r.motivoCancelacion && (
                                <span className="block text-red-500">
                                  Motivo: {r.motivoCancelacion}
                                </span>
                              )}
                            </td>
                            <td className="py-3">
                              <div className="flex flex-wrap gap-2">
                                {r.estado === 'pendiente' && (
                                  <button
                                    type="button"
                                    onClick={() => confirmarPorCoordinador(r._id)}
                                    className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                                  >
                                    Confirmar
                                  </button>
                                )}
                                {r.estado !== 'cancelada' && (
                                  <button
                                    type="button"
                                    onClick={() => cancelarPorCoordinador(r._id)}
                                    className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                                  >
                                    Cancelar cupo
                                  </button>
                                )}
                                {usuario?.rol === 'administrador' && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setFormReasignar({
                                        reservaId: r._id,
                                        nuevoBloqueId: r.bloque?._id || r.bloque || '',
                                        nuevaFecha: r.fecha || '',
                                      })
                                    }
                                    className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold hover:bg-slate-50"
                                  >
                                    Reasignar
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
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
                TABLA GENERAL DE HORARIOS Y RECINTOS
            =============================================================== */}
            <div className="rounded-[22px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold">
                    {usuario?.rol === 'cliente'
                      ? 'Catálogo General de Recintos y Horarios (ST02.10)'
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
      </section>
    </main>
  );
}
