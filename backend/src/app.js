const express = require('express');
const cors = require('cors');
const usuariosRoutes = require('./routes/usuarios.routes');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// TODO (ST01.04): anteponer aquí el middleware de autenticación que llena req.user
app.use('/api/usuarios', usuariosRoutes);

module.exports = app;