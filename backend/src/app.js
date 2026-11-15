const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth.routes');
const usuariosRoutes = require('./routes/usuarios.routes');
const { autenticar } = require('./middlewares/auth');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/usuarios', autenticar, usuariosRoutes);

module.exports = app;