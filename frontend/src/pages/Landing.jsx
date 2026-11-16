import { useState } from 'react';
import Icon from '../components/Icon.jsx';

const heroImage =
  'https://images.unsplash.com/photo-1685633224860-7655234d9cd5?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=88&w=1600';

const spaces = [
  {
    name: 'Arena Norte',
    type: 'Entrenamiento funcional',
    location: 'Zona Norte',
    rating: '4.9',
    price: '$18',
    image:
      'https://images.unsplash.com/photo-1637666218229-1fe0a9419267?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=85&w=900',
  },
  {
    name: 'Studio Pulse',
    type: 'Gimnasio & cardio',
    location: 'Centro',
    rating: '4.8',
    price: '$14',
    image:
      'https://images.unsplash.com/photo-1637870473618-8c9fa7d11f0a?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=85&w=900',
  },
  {
    name: 'Club Elevate',
    type: 'Fuerza & rendimiento',
    location: 'Zona Oeste',
    rating: '4.9',
    price: '$22',
    image:
      'https://images.unsplash.com/photo-1591940808747-05d59b31a299?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=85&w=900',
  },
];

const categories = [
  { icon: 'dumbbell', title: 'Musculación', detail: '42 espacios' },
  { icon: 'activity', title: 'Funcional', detail: '28 espacios' },
  { icon: 'users', title: 'Clases grupales', detail: '35 clases' },
  { icon: 'target', title: 'Con instructor', detail: '24 expertos' },
];

export default function Landing({ onIniciarSesion, onCrearCuenta }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchMessage, setSearchMessage] = useState('');

  const scrollTo = (id) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white text-[#10233f]">
      <header className="sticky top-0 z-40 border-t-4 border-[#1268e8] bg-white/95 shadow-[0_1px_0_rgba(15,35,63,.08)] backdrop-blur-lg">
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 lg:px-8">
          <button
            onClick={() => scrollTo('inicio')}
            className="flex items-center gap-3"
            aria-label="Ir al inicio"
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#1268e8] text-white shadow-lg shadow-blue-200">
              <Icon name="logo" className="h-6 w-6" />
            </span>
            <span className="text-xl font-extrabold tracking-tight">FitBook</span>
          </button>

          <nav className="hidden items-center gap-8 text-sm font-semibold text-slate-600 md:flex">
            <button onClick={() => scrollTo('inicio')} className="nav-link">
              Inicio
            </button>
            <button onClick={() => scrollTo('espacios')} className="nav-link">
              Espacios
            </button>
            <button onClick={() => scrollTo('como-funciona')} className="nav-link">
              Cómo funciona
            </button>
            <button onClick={() => scrollTo('beneficios')} className="nav-link">
              Beneficios
            </button>
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <button
              onClick={onIniciarSesion}
              className="px-4 py-2.5 text-sm font-bold text-[#1268e8]"
            >
              Iniciar sesión
            </button>
            <button onClick={onCrearCuenta} className="primary-button !px-5 !py-3">
              Crear cuenta
            </button>
          </div>
          <button
            className="grid h-11 w-11 place-items-center rounded-xl bg-slate-100 md:hidden"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Abrir menú"
          >
            <Icon name={menuOpen ? 'close' : 'menu'} />
          </button>
        </div>
        {menuOpen && (
          <div className="border-t border-slate-100 bg-white px-5 py-5 md:hidden">
            <div className="flex flex-col gap-1">
              {[
                ['inicio', 'Inicio'],
                ['espacios', 'Espacios'],
                ['como-funciona', 'Cómo funciona'],
                ['beneficios', 'Beneficios'],
              ].map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => scrollTo(id)}
                  className="rounded-xl px-4 py-3 text-left font-semibold hover:bg-blue-50"
                >
                  {label}
                </button>
              ))}
              <button onClick={onIniciarSesion} className="primary-button mt-3">
                Iniciar sesión
              </button>
              <button onClick={onCrearCuenta} className="secondary-button mt-1">
                Crear cuenta
              </button>
            </div>
          </div>
        )}
      </header>

      <main>
        <section id="inicio" className="relative overflow-hidden bg-[#f7faff]">
          <div className="hero-grid absolute inset-0 opacity-60" />
          <div className="relative mx-auto grid min-h-[690px] max-w-7xl items-center gap-14 px-5 py-16 lg:grid-cols-[.95fr_1.05fr] lg:px-8 lg:py-20">
            <div className="max-w-2xl">
              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-4 py-2 text-sm font-bold text-[#1268e8] shadow-sm">
                <span className="h-2 w-2 rounded-full bg-[#26c281]" />
                Tu entrenamiento, a tu manera
              </div>
              <h1 className="text-[clamp(2.8rem,6vw,5.2rem)] font-extrabold leading-[.98] tracking-[-.055em] text-[#0e2545]">
                Tu espacio.
                <br />
                Tu horario.
                <br />
                <span className="text-[#1268e8]">Tu mejor versión.</span>
              </h1>
              <p className="mt-7 max-w-xl text-lg leading-8 text-slate-600">
                Reserva gimnasios, canchas y sesiones con instructores en segundos. Sin llamadas,
                sin esperas y con disponibilidad en tiempo real.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <button onClick={() => scrollTo('espacios')} className="primary-button group">
                  Explorar espacios
                  <Icon name="arrow" className="h-5 w-5 transition group-hover:translate-x-1" />
                </button>
                <button onClick={onIniciarSesion} className="secondary-button">
                  Ya tengo una cuenta
                </button>
              </div>
              <div className="mt-10 flex flex-wrap items-center gap-x-7 gap-y-3 text-sm font-semibold text-slate-500">
                <span className="flex items-center gap-2">
                  <Icon name="check" className="h-4 w-4 text-emerald-500" /> Reserva inmediata
                </span>
                <span className="flex items-center gap-2">
                  <Icon name="check" className="h-4 w-4 text-emerald-500" /> Sin costos ocultos
                </span>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-[620px] lg:justify-self-end">
              <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-blue-200/60 blur-3xl" />
              <div className="relative overflow-hidden rounded-[32px] border-[8px] border-white bg-slate-200 shadow-[0_30px_80px_rgba(18,57,105,.22)]">
                <img
                  src={heroImage}
                  alt="Gimnasio moderno equipado para entrenar"
                  className="h-[500px] w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#071a33]/70 via-transparent to-transparent" />
                <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between text-white">
                  <div>
                    <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" /> Disponible hoy
                    </div>
                    <p className="text-2xl font-bold">Arena Norte</p>
                    <p className="mt-1 text-sm text-white/75">Entrenamiento funcional</p>
                  </div>
                  <div className="rounded-xl bg-white/15 px-4 py-3 text-right backdrop-blur-md">
                    <p className="text-xs text-white/70">Desde</p>
                    <p className="text-xl font-bold">
                      $18<span className="text-xs font-medium">/hora</span>
                    </p>
                  </div>
                </div>
              </div>
              <div className="absolute -left-5 top-16 hidden items-center gap-3 rounded-2xl bg-white p-4 shadow-xl sm:flex">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-[#1268e8]">
                  <Icon name="calendar" />
                </span>
                <div>
                  <p className="text-xs text-slate-400">Próxima reserva</p>
                  <p className="text-sm font-bold">Hoy, 18:30</p>
                </div>
              </div>
              <div className="absolute -bottom-5 right-8 hidden items-center gap-3 rounded-2xl bg-white p-4 shadow-xl sm:flex">
                <div className="flex -space-x-2">
                  {['#1268e8', '#33b88b', '#ff9563'].map((color) => (
                    <span
                      key={color}
                      className="h-9 w-9 rounded-full border-2 border-white"
                      style={{ background: color }}
                    />
                  ))}
                </div>
                <div>
                  <p className="text-sm font-bold">+2.400 atletas</p>
                  <p className="text-xs text-slate-400">entrenando este mes</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative z-10 mx-auto -mt-1 max-w-7xl px-5 lg:-mt-12 lg:px-8">
          <form
            className="grid gap-3 rounded-[24px] border border-slate-100 bg-white p-4 shadow-[0_20px_60px_rgba(20,52,92,.12)] md:grid-cols-[1fr_1fr_1fr_auto] md:p-5"
            onSubmit={(event) => {
              event.preventDefault();
              setSearchMessage('Encontramos 18 opciones disponibles para ti.');
              window.setTimeout(() => scrollTo('espacios'), 300);
            }}
          >
            <label className="search-field">
              <Icon name="activity" className="h-5 w-5 text-[#1268e8]" />
              <span>
                <small>¿Qué quieres hacer?</small>
                <select aria-label="Actividad">
                  <option>Entrenamiento funcional</option>
                  <option>Musculación</option>
                  <option>Clase grupal</option>
                </select>
              </span>
            </label>
            <label className="search-field">
              <Icon name="map" className="h-5 w-5 text-[#1268e8]" />
              <span>
                <small>¿Dónde?</small>
                <input aria-label="Ubicación" defaultValue="Cerca de mí" />
              </span>
            </label>
            <label className="search-field">
              <Icon name="calendar" className="h-5 w-5 text-[#1268e8]" />
              <span>
                <small>¿Cuándo?</small>
                <input aria-label="Fecha" type="date" />
              </span>
            </label>
            <button className="primary-button min-h-14 !px-6" type="submit">
              <Icon name="search" /> Buscar
            </button>
          </form>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-24 lg:px-8">
          <div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="section-kicker">Encuentra tu actividad</p>
              <h2 className="section-title">Todo lo que necesitas para moverte</h2>
            </div>
            <p className="max-w-md leading-7 text-slate-500">
              Desde una sesión rápida hasta un plan completo con instructor.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((category, index) => (
              <button
                key={category.title}
                onClick={() => scrollTo('espacios')}
                className="group rounded-[22px] border border-slate-200 bg-white p-6 text-left transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-100/60"
              >
                <div
                  className={`mb-7 grid h-13 w-13 place-items-center rounded-2xl ${index === 0 ? 'bg-[#1268e8] text-white' : 'bg-blue-50 text-[#1268e8]'}`}
                >
                  <Icon name={category.icon} className="h-6 w-6" />
                </div>
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold">{category.title}</h3>
                    <p className="mt-1 text-sm text-slate-400">{category.detail}</p>
                  </div>
                  <Icon
                    name="chevron"
                    className="h-5 w-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-[#1268e8]"
                  />
                </div>
              </button>
            ))}
          </div>
        </section>

        <section id="espacios" className="scroll-mt-24 bg-[#f6f9fd] py-24">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <div className="mb-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div>
                <p className="section-kicker">Cerca de ti</p>
                <h2 className="section-title">Espacios que inspiran</h2>
              </div>
              <button
                onClick={onIniciarSesion}
                className="flex items-center gap-2 font-bold text-[#1268e8]"
              >
                Ver todos <Icon name="arrow" className="h-5 w-5" />
              </button>
            </div>
            {searchMessage && (
              <div className="mb-6 flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800">
                <Icon name="check" className="h-5 w-5" /> {searchMessage}
              </div>
            )}
            <div className="grid gap-6 md:grid-cols-3">
              {spaces.map((space) => (
                <article
                  key={space.name}
                  className="group overflow-hidden rounded-[24px] border border-slate-200 bg-white transition duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-slate-200"
                >
                  <div className="relative h-60 overflow-hidden">
                    <img
                      src={space.image}
                      alt={space.name}
                      className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                    />
                    <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-emerald-600 shadow-sm">
                      Disponible hoy
                    </span>
                    <span className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-[#10233f]/85 px-3 py-1.5 text-xs font-bold text-white backdrop-blur">
                      <Icon name="star" className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />{' '}
                      {space.rating}
                    </span>
                  </div>
                  <div className="p-6">
                    <p className="text-sm font-semibold text-[#1268e8]">{space.type}</p>
                    <div className="mt-1 flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-bold">{space.name}</h3>
                        <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-400">
                          <Icon name="map" className="h-4 w-4" /> {space.location}
                        </p>
                      </div>
                      <p className="text-right text-xl font-extrabold">
                        {space.price}
                        <span className="block text-xs font-medium text-slate-400">por hora</span>
                      </p>
                    </div>
                    <button
                      onClick={onIniciarSesion}
                      className="secondary-button mt-6 w-full !py-3"
                    >
                      Ver disponibilidad
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="como-funciona" className="scroll-mt-24 py-24">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <div className="mx-auto mb-14 max-w-2xl text-center">
              <p className="section-kicker">Así de fácil</p>
              <h2 className="section-title">Del deseo de entrenar a la acción</h2>
              <p className="mt-4 leading-7 text-slate-500">Tres pasos. Cero complicaciones.</p>
            </div>
            <div className="relative grid gap-8 md:grid-cols-3">
              <div className="absolute left-[17%] right-[17%] top-8 hidden border-t-2 border-dashed border-blue-100 md:block" />
              {[
                ['01', 'Encuentra', 'Explora espacios, actividades e instructores cerca de ti.'],
                ['02', 'Elige', 'Compara opciones y selecciona el horario que mejor te funciona.'],
                ['03', 'Entrena', 'Confirma tu reserva y llega listo para dar lo mejor de ti.'],
              ].map(([number, title, detail]) => (
                <div key={number} className="relative text-center">
                  <div className="relative z-10 mx-auto mb-6 grid h-16 w-16 place-items-center rounded-2xl border-4 border-white bg-[#1268e8] text-lg font-extrabold text-white shadow-lg shadow-blue-200">
                    {number}
                  </div>
                  <h3 className="text-xl font-bold">{title}</h3>
                  <p className="mx-auto mt-3 max-w-xs leading-7 text-slate-500">{detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="beneficios" className="scroll-mt-24 px-5 pb-24 lg:px-8">
          <div className="mx-auto grid max-w-7xl overflow-hidden rounded-[32px] bg-[#102d55] lg:grid-cols-2">
            <div className="p-8 sm:p-12 lg:p-16">
              <p className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-blue-300">
                Más tiempo para ti
              </p>
              <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
                Entrenar debería ser la parte difícil.
              </h2>
              <p className="mt-5 max-w-lg text-lg leading-8 text-blue-100/70">
                Nosotros hacemos que reservar sea simple, rápido y transparente.
              </p>
              <div className="mt-9 grid gap-5 sm:grid-cols-2">
                {[
                  'Disponibilidad en tiempo real',
                  'Instructores verificados',
                  'Cambios sin complicaciones',
                  'Recordatorios automáticos',
                ].map((benefit) => (
                  <div
                    key={benefit}
                    className="flex items-center gap-3 text-sm font-semibold text-white"
                  >
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#26c281] text-white">
                      <Icon name="check" className="h-4 w-4" />
                    </span>
                    {benefit}
                  </div>
                ))}
              </div>
            </div>
            <div className="relative min-h-[390px] overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1729156638396-47c6a6cffe16?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=85&w=1000"
                alt="Espacio de entrenamiento moderno"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#102d55] via-[#102d55]/20 to-transparent" />
              <div className="absolute bottom-8 left-8 right-8 rounded-2xl border border-white/20 bg-white/15 p-5 text-white backdrop-blur-lg">
                <div className="flex items-center gap-2 text-amber-300">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Icon key={star} name="star" className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="mt-3 font-semibold leading-6">
                  “Reservé mi primera clase en menos de dos minutos.”
                </p>
                <p className="mt-2 text-sm text-white/60">María · Miembro desde 2024</p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-blue-100 bg-blue-50/70 py-20 text-center">
          <div className="mx-auto max-w-3xl px-5">
            <p className="section-kicker">Empieza hoy</p>
            <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
              Tu próximo entrenamiento está más cerca.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-slate-500">
              Crea tu cuenta y encuentra el espacio perfecto para moverte.
            </p>
            <button onClick={onCrearCuenta} className="primary-button mt-8">
              Crear cuenta gratis <Icon name="arrow" />
            </button>
          </div>
        </section>
      </main>

      <footer className="bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-7 px-5 py-10 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#1268e8] text-white">
              <Icon name="logo" className="h-5 w-5" />
            </span>
            <span className="font-extrabold">FitBook</span>
          </div>
          <p className="text-sm text-slate-400">© 2025 FitBook. Diseñado para moverte.</p>
          <div className="flex gap-6 text-sm font-semibold text-slate-500">
            <button>Privacidad</button>
            <button>Ayuda</button>
            <button onClick={onIniciarSesion}>Acceder</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
