const pool = require('./db/db');

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Error al conectar:', err.message);
  } else {
    console.log('✅ Conexión exitosa:', res.rows[0]);
  }
  process.exit();
});
