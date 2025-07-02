const pool = require('../db/db');

const obtenerBloquesProfesor = async (req, res) => {
  const idProfesor = req.usuario.id;

  try {
    const result = await pool.query(
      `SELECT b.id_bloque, a.nombre AS asignatura, b.aula, b.dia_semana, b.hora_inicio
       FROM bloque_clase b
       JOIN asignatura a ON b.id_asignatura = a.id_asignatura
       WHERE b.id_profesor = $1`,
      [idProfesor]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener bloques del profesor:', err);
    res.status(500).json({ error: 'Error al obtener bloques del profesor' });
  }
};


const crearBloque = async (req, res) => {
  const id_profesor = req.usuario.id;
  const { id_asignatura, creditos, aula, dia_semana, hora_inicio } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO bloque_clase (id_asignatura, id_profesor, creditos, aula, dia_semana, hora_inicio)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id_asignatura, id_profesor, creditos, aula, dia_semana, hora_inicio]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error al crear bloque:', err);
    res.status(500).json({ error: 'Error al crear bloque' });
  }
};

module.exports = { obtenerBloquesProfesor, crearBloque };
