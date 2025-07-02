const pool = require('../db/db');

// Obtener recordatorios del usuario
exports.getRecordatorios = async (req, res) => {
  const userId = req.session.userId;
  const result = await pool.query(
    'SELECT * FROM recordatorio WHERE usuario_id = $1 ORDER BY fecha, id',
    [userId]
  );
  res.json(result.rows);
};

// Crear un nuevo recordatorio
exports.createRecordatorio = async (req, res) => {
  const userId = req.session.userId;
  const { fecha, titulo, asignatura, descripcion } = req.body;
  const result = await pool.query(
    'INSERT INTO recordatorio (usuario_id, fecha, titulo, asignatura, descripcion) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [userId, fecha, titulo, asignatura, descripcion]
  );
  res.json(result.rows[0]);
};

// Eliminar un recordatorio
exports.deleteRecordatorio = async (req, res) => {
  const userId = req.session.userId;
  const id = req.params.id;
  await pool.query('DELETE FROM recordatorio WHERE id = $1 AND usuario_id = $2', [id, userId]);
  res.json({ success: true });
};