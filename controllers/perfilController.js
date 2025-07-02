const pool = require('../db/db');
const bcrypt = require('bcrypt');
const path = require('path');
const { DateTime } = require('luxon');

function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

exports.verPerfil = async (req, res) => {
  const userId = req.session.userId;
  const userResult = await pool.query('SELECT username, email, role, foto FROM usuario WHERE id = $1', [userId]);

  // Obtener las 5 evaluaciones pendientes más cercanas SOLO de asignaturas inscritas
  const hoyChile = DateTime.now().setZone('America/Santiago').toISODate();
  const evalsResult = await pool.query(`
    SELECT e.nombre, e.tipo, e.fecha, a.nombre AS asignatura_nombre
    FROM evaluacion e
    JOIN asignatura a ON a.id = e.asignatura_id
    WHERE e.usuario_id = $1
      AND e.fecha >= $2
      AND e.asignatura_id IN (SELECT asignatura_id FROM inscripcion WHERE usuario_id = $1)
    ORDER BY e.fecha ASC
    LIMIT 5
  `, [userId, hoyChile]);

  // Formatea la fecha para mostrarla bonito y con día en mayúscula
  const evaluaciones = evalsResult.rows.map(ev => ({
    ...ev,
    fechaString: capitalizeFirst(
      DateTime.fromJSDate(new Date(ev.fecha), { zone: 'utc' })
        .setZone('America/Santiago')
        .setLocale('es')
        .toFormat('cccc d/LL/yyyy')
    )
  }));

  const usuario = userResult.rows[0];
  res.render('perfil', { usuario, evaluaciones, isDashboard: true });
};

exports.editarPerfilVista = async (req, res) => {
  const userId = req.session.userId;
  const userResult = await pool.query('SELECT username, email, role, foto FROM usuario WHERE id = $1', [userId]);
  res.render('editarPerfil', { usuario: userResult.rows[0], isDashboard: true, guardado: req.query.guardado });
};

exports.editarPerfil = async (req, res) => {
  const userId = req.session.userId;
  const { username, email, password, fotoActual } = req.body;
  let fotoPath = fotoActual || null;
  if (req.file) {
    fotoPath = '/uploads/' + req.file.filename;
  }
  let query, params;
  if (password && password.trim() !== '') {
    const hashed = await bcrypt.hash(password, 10);
    query = 'UPDATE usuario SET username = $1, email = $2, password = $3, foto = $4 WHERE id = $5';
    params = [username, email, hashed, fotoPath, userId];
  } else {
    query = 'UPDATE usuario SET username = $1, email = $2, foto = $3 WHERE id = $4';
    params = [username, email, fotoPath, userId];
  }
  await pool.query(query, params);
  res.redirect('/perfil/editar?guardado=1');
};