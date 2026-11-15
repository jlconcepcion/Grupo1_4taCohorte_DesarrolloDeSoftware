import Icon from '../components/Icon.jsx';

const ROLES = {
  cliente: {
    nombre: 'Cliente',
    icono: 'calendar',
    descripcion:
      'Consulta disponibilidad, reserva y cancela cupos, y envía quejas o sugerencias.',
    modulos: ['Consultar recintos', 'Reservar cupos', 'Mis reservas', 'Sugerencias'],
  },
  instructor: {
    nombre: 'Instructor',
    icono: 'users',
    descripcion:
      'Crea clases, publica bloques de disponibilidad y consulta el conteo de reservas.',
    modulos: ['Mis clases', 'Mis horarios', 'Conteo de reservas'],
  },
  coordinador: {
    nombre: 'Coordinador',
    icono: 'activity',
    descripcion:
      'Confirma o cancela reservas, administra horarios por recinto y revisa sugerencias.',
    modulos: ['Reservas pendientes', 'Horarios por recinto', 'Sugerencias', 'Reportes'],
  },
  administrador: {
    nombre: 'Administrador',
    icono: 'target',
    descripcion:
      'Gestiona usuarios, instructores y recintos, exporta reportes y consulta indicadores.',
    modulos: ['Usuarios e instructores', 'Recintos', 'Reservas', 'Reportes', 'Indicadores'],
  },
};

export default function Dashboard({ usuario, onSalir }) {
  const rol = ROLES[usuario?.rol] || {
    nombre: usuario?.rol || 'Usuario',
    icono: 'logo',
    descripcion: 'Sesión activa.',
    modulos: [],
  };

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
              {rol.nombre}
            </span>
            <button onClick={onSalir} className="secondary-button !px-4 !py-2.5">
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
        <p className="section-kicker">Panel de {rol.nombre}</p>
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Hola de nuevo</h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-500">{rol.descripcion}</p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rol.modulos.map((modulo, index) => (
            <article
              key={modulo}
              className="rounded-[22px] border border-slate-200 bg-white p-6 transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-100/60"
            >
              <div
                className={`mb-6 grid h-12 w-12 place-items-center rounded-2xl ${index === 0 ? 'bg-[#1268e8] text-white' : 'bg-blue-50 text-[#1268e8]'}`}
              >
                <Icon name={rol.icono} className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-bold">{modulo}</h2>
              <p className="mt-1 text-sm text-slate-400">Disponible en los próximos sprints.</p>
            </article>
          ))}
        </div>

        <div className="mt-10 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-700">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-500 text-white">
            <Icon name="check" className="h-4 w-4" />
          </span>
          Sprint 1 completado: autenticación, sesión y control de acceso por rol.
        </div>
      </section>
    </main>
  );
}
