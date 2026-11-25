const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth.routes');
const usuariosRoutes = require('./routes/usuarios.routes');
const recintosRoutes = require('./routes/recintos.routes');
const clasesRoutes = require('./routes/clases.routes');
const bloquesRoutes = require('./routes/bloques.routes');
const reservasRoutes = require('./routes/reservas.routes');
const confirmacionRoutes = require('./routes/confirmacion.routes');
const notificacionesRoutes = require('./routes/notificaciones.routes');
const reportesRoutes = require('./routes/reportes.routes');
const preferenciasRoutes = require('./routes/preferencias.routes');
const { autenticar } = require('./middlewares/auth');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/notificaciones/confirmar-asistencia', confirmacionRoutes);
app.use('/api/usuarios', autenticar, usuariosRoutes);
app.use('/api/recintos', autenticar, recintosRoutes);
app.use('/api/clases', autenticar, clasesRoutes);
app.use('/api/bloques', autenticar, bloquesRoutes);
app.use('/api/reservas', autenticar, reservasRoutes);
app.use('/api/notificaciones', autenticar, notificacionesRoutes);
app.use('/api/reportes', autenticar, reportesRoutes);
app.use('/api/mi-perfil/preferencias-recordatorio', autenticar, preferenciasRoutes);

module.exports = app;
