require('dotenv').config();
process.env.TZ = process.env.TZ || 'America/Bogota';
const app = require('./app');
const connectDB = require('./config/db');
const { iniciarRecordatorios } = require('./jobs/recordatorios.job');

const PORT = process.env.PORT || 3000;

connectDB()
  .then(() => {
    iniciarRecordatorios();
    app.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('No se pudo conectar a MongoDB:', err.message);
    process.exit(1);
  });