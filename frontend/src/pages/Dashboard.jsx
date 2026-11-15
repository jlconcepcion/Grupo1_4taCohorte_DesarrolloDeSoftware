const ROLES = {
  cliente: {
    nombre: 'Cliente',
    descripcion:
      'Consulta disponibilidad, reserva y cancela cupos, y envía quejas o sugerencias.',
    modulos: ['Consultar recintos', 'Reservar cupos', 'Mis reservas', 'Sugerencias'],
  },
  instructor: {
    nombre: 'Instructor',
    descripcion:
      'Crea clases, publica bloques de disponibilidad y consulta el conteo de reservas.',
    modulos: ['Mis clases', 'Mis horarios', 'Conteo de reservas'],
  },
  coordinador: {
    nombre: 'Coordinador',
    descripcion:
      'Confirma o cancela reservas, administra horarios por recinto y revisa sugerencias.',
    modulos: ['Reservas pendientes', 'Horarios por recinto', 'Sugerencias', 'Reportes'],
  },
  administrador: {
    nombre: 'Administrador',
    descripcion:
      'Gestiona usuarios, instructores y recintos, exporta reportes y consulta indicadores.',
    modulos: ['Usuarios e instructores', 'Recintos', 'Reservas', 'Reportes', 'Indicadores'],
  },
};

export default function Dashboard({ usuario, onSalir }) {
  const rol = ROLES[usuario?.rol] || {
    nombre: usuario?.rol || 'Usuario',
    descripcion: 'Sesión activa.',
    modulos: [],
  };

  return (
    <main className="pantalla-panel">
      <header className="barra">
        <div className="barra-identidad">
          <span className="logo logo-pequeno">G1</span>
          <div>
            <strong>Reservas Gimnasio y Canchas</strong>
            <span>{usuario?.correo}</span>
          </div>
        </div>
        <div className="barra-acciones">
          <span className={`etiqueta-rol rol-${usuario?.rol}`}>{rol.nombre}</span>
          <button type="button" className="boton-salir" onClick={onSalir}>
            Cerrar sesión
          </button>
        </div>
      </header>

      <section className="contenido">
        <div className="bienvenida">
          <p className="saludo">Hola de nuevo</p>
          <h1>Panel de {rol.nombre}</h1>
          <p>{rol.descripcion}</p>
        </div>

        <div className="rejilla">
          {rol.modulos.map((modulo) => (
            <article className="modulo" key={modulo}>
              <span className="modulo-punto" />
              <h2>{modulo}</h2>
              <p>Disponible en los próximos sprints.</p>
            </article>
          ))}
        </div>

        <p className="nota">
          Sprint 1 completado: autenticación, sesión y control de acceso por rol.
        </p>
      </section>
    </main>
  );
}
