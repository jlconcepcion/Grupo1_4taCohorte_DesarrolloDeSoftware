const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const {
  MONGODB_SCHEMAS,
} = require('../../../database/migrations/001_mongodb_schemas_and_indexes');

function opcionesEquivalentes(actual, deseadas) {
  return (
    Boolean(actual.unique) === Boolean(deseadas.unique) &&
    JSON.stringify(actual.partialFilterExpression || null) ===
      JSON.stringify(deseadas.partialFilterExpression || null)
  );
}

async function sincronizarIndice(coleccion, definicion) {
  const opciones = definicion.options || {};
  const nombreDeseado = opciones.name;
  const indices = await coleccion.indexes();
  const existente = indices.find(
    (indice) => JSON.stringify(indice.key) === JSON.stringify(definicion.key)
  );

  if (
    existente &&
    nombreDeseado &&
    existente.name !== nombreDeseado &&
    opcionesEquivalentes(existente, opciones)
  ) {
    await coleccion.dropIndex(existente.name);
  }

  await coleccion.createIndex(definicion.key, opciones);
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI no configurada');
  }

  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  for (const [nombre, config] of Object.entries(MONGODB_SCHEMAS)) {
    const existe = await db.listCollections({ name: nombre }).next();

    if (!existe) {
      await db.createCollection(
        nombre,
        config.validator ? { validator: config.validator } : {}
      );
    } else if (config.validator) {
      await db.command({ collMod: nombre, validator: config.validator });
    }

    for (const indice of config.indexes || []) {
      await sincronizarIndice(db.collection(nombre), indice);
    }

    console.log(`Colección ${nombre}: validador e índices sincronizados`);
  }
}

main()
  .then(async () => {
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('Error al aplicar migraciones:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  });
