const pool = require('../db/db');
const bcrypt = require('bcrypt');

// Dashboard principal
exports.dashboard = (req, res) => {
  res.render('profesorDashboard', { usuario: req.session });
};

// Vista de asignaturas y formulario de creación
exports.asignaturasVista = async (req, res) => {
  const asignaturas = (await pool.query(
    `SELECT a.id, a.nombre, a.seccion, a.codigo, a.cupos, a.creditos, a.sede,
      (SELECT COUNT(*) FROM inscripcion i WHERE i.asignatura_id = a.id) AS alumnosCount
     FROM asignatura a
     WHERE a.profesor_id = $1
     ORDER BY a.nombre, a.seccion`,
    [req.session.userId]
  )).rows;
  res.render('profesorAsignaturas', { asignaturas, usuario: req.session });
};

// Crear nueva asignatura
exports.crearAsignatura = async (req, res) => {
  const { nombre, codigo, seccion, cupos, creditos, sede } = req.body;
  const horarios = req.body.horarios; // [{dia, bloque}, ...]

  if (!nombre || !codigo || !seccion || !cupos || !creditos || !sede || !horarios) {
    return res.redirect('/profesor/asignaturas');
  }

  // 1. Crear la asignatura
  const result = await pool.query(
    `INSERT INTO asignatura (nombre, codigo, seccion, cupos, profesor_id, creditos, sede)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [nombre, codigo, seccion, cupos, req.session.userId, creditos, sede]
  );
  const asignatura_id = result.rows[0].id;

  // 2. Insertar los horarios (en asignatura_horario)
  if (Array.isArray(horarios)) {
    for (const h of horarios) {
      if (h.dia && h.bloque) {
        // Extraer hora_inicio y hora_fin del bloque
        const [hora_inicio, hora_fin] = h.bloque.split(' - ');
        await pool.query(
          `INSERT INTO asignatura_horario (asignatura_id, dia, hora_inicio, hora_fin)
           VALUES ($1, $2, $3, $4)`,
          [asignatura_id, h.dia, hora_inicio, hora_fin]
        );
      }
    }
  } else if (horarios.dia && horarios.bloque) {
    // Si solo hay un horario
    const [hora_inicio, hora_fin] = horarios.bloque.split(' - ');
    await pool.query(
      `INSERT INTO asignatura_horario (asignatura_id, dia, hora_inicio, hora_fin)
       VALUES ($1, $2, $3, $4)`,
      [asignatura_id, horarios.dia, hora_inicio, hora_fin]
    );
  }

  res.redirect('/profesor/asignaturas');
};

// Ver alumnos de una asignatura
exports.alumnosAsignatura = async (req, res) => {
  const asignatura = (await pool.query(
    'SELECT * FROM asignatura WHERE id = $1 AND profesor_id = $2',
    [req.params.id, req.session.userId]
  )).rows[0];
  if (!asignatura) return res.redirect('/profesor/asignaturas');
  const alumnos = (await pool.query(
    `SELECT u.username, u.email FROM inscripcion i
     JOIN usuario u ON u.id = i.usuario_id
     WHERE i.asignatura_id = $1`,
    [req.params.id]
  )).rows;
  res.render('profesorAlumnos', { asignatura, alumnos, usuario: req.session });
};

// Vista de evaluaciones y formulario de creación
exports.evaluacionesVista = async (req, res) => {
  const asignaturas = (await pool.query(
    'SELECT id, nombre FROM asignatura WHERE profesor_id = $1',
    [req.session.userId]
  )).rows;
  const evaluaciones = (await pool.query(
    `SELECT e.id, e.titulo, e.fecha, a.nombre AS asignatura_nombre
     FROM evaluacion_profe e
     JOIN asignatura a ON a.id = e.asignatura_id
     WHERE a.profesor_id = $1
     ORDER BY e.fecha DESC`,
    [req.session.userId]
  )).rows;
  res.render('profesorEvaluaciones', { asignaturas, evaluaciones, usuario: req.session });
};

// Crear nueva evaluación
exports.crearEvaluacion = async (req, res) => {
  const { asignatura_id, titulo, fecha } = req.body;
  if (!asignatura_id || !titulo || !fecha) return res.redirect('/profesor/evaluaciones');

  // 1. Crea la evaluación en evaluacion_profe (opcional, si quieres mantener el registro)
  await pool.query(
    'INSERT INTO evaluacion_profe (asignatura_id, titulo, fecha) VALUES ($1, $2, $3)',
    [asignatura_id, titulo, fecha]
  );

  // 2. Crea la evaluación para cada alumno inscrito en la tabla evaluacion
  const alumnos = (await pool.query(
    'SELECT usuario_id FROM inscripcion WHERE asignatura_id = $1',
    [asignatura_id]
  )).rows;

  const asignatura = (await pool.query(
    'SELECT nombre FROM asignatura WHERE id = $1',
    [asignatura_id]
  )).rows[0];

  for (const alumno of alumnos) {
    await pool.query(
      `INSERT INTO evaluacion (usuario_id, asignatura_id, nombre, titulo, fecha, tipo, descripcion)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        alumno.usuario_id,
        asignatura_id,
        asignatura.nombre, // <--- aquí va el nombre de la asignatura
        titulo,
        fecha,
        'Evaluación',
        'Creada por el profesor'
      ]
    );
  }
 
  res.redirect('/profesor/evaluaciones');
};

// Vista de perfil
exports.perfilVista = async (req, res) => {
  const profesor = (await pool.query(
    'SELECT username, email, foto FROM usuario WHERE id = $1',
    [req.session.userId]
  )).rows[0];
  res.render('profesorPerfil', { usuario: profesor });
};

// Vista para editar perfil
exports.perfilEditarVista = async (req, res) => {
  const profesor = (await pool.query(
    'SELECT username, email, foto FROM usuario WHERE id = $1',
    [req.session.userId]
  )).rows[0];
  res.render('profesorPerfilEditar', { usuario: profesor });
};

// Guardar cambios de perfil
exports.perfilEditar = async (req, res) => {
  const { username, email, password, fotoActual } = req.body;
  let fotoPath = fotoActual || null;
  if (req.file) {
    fotoPath = '/uploads/' + req.file.filename;
  }
  let query, params;
  if (password && password.trim() !== '') {
    const hashed = await bcrypt.hash(password, 10);
    query = 'UPDATE usuario SET username = $1, email = $2, password = $3, foto = $4 WHERE id = $5';
    params = [username, email, hashed, fotoPath, req.session.userId];
  } else {
    query = 'UPDATE usuario SET username = $1, email = $2, foto = $3 WHERE id = $4';
    params = [username, email, fotoPath, req.session.userId];
  }
  await pool.query(query, params);
  res.redirect('/profesor/perfil');
};

// Eliminar asignatura (y sus horarios y alumnos asociados)
exports.eliminarAsignatura = async (req, res) => {
  const { id } = req.params;
  // Solo permite eliminar si el profesor es dueño de la asignatura
  const result = await pool.query(
    'DELETE FROM asignatura WHERE id = $1 AND profesor_id = $2 RETURNING id',
    [id, req.session.userId]
  );
  res.redirect('/profesor/asignaturas');
};

// Eliminar evaluación
exports.eliminarEvaluacion = async (req, res) => {
  const { id } = req.params;

  // 1. Obtén los datos de la evaluación a eliminar
  const evalProfe = (await pool.query(
    'SELECT asignatura_id, titulo, fecha FROM evaluacion_profe WHERE id = $1',
    [id]
  )).rows[0];

  if (evalProfe) {
    // 2. Elimina de evaluacion_profe
    await pool.query('DELETE FROM evaluacion_profe WHERE id = $1', [id]);

    // 3. Elimina de evaluacion de los alumnos (por asignatura, título y fecha)
    await pool.query(
      'DELETE FROM evaluacion WHERE asignatura_id = $1 AND titulo = $2 AND fecha = $3',
      [evalProfe.asignatura_id, evalProfe.titulo, evalProfe.fecha]
    );
  }

  res.redirect('/profesor/evaluaciones');
};

exports.editarPerfilVista = async (req, res) => {
  const profesor = (await pool.query(
    'SELECT username, email, foto FROM usuario WHERE id = $1',
    [req.session.userId]
  )).rows[0];
  res.render('profesorPerfilEditar', {
    usuario: profesor,
    guardado: req.query.guardado === '1'
  });
};

exports.editarPerfil = async (req, res) => {
  const { username, email, password, fotoActual } = req.body;
  let fotoPath = fotoActual || null;
  if (req.file) {
    fotoPath = '/uploads/' + req.file.filename;
  }
  let query, params;
  if (password && password.trim() !== '') {
    const hashed = await bcrypt.hash(password, 10);
    query = 'UPDATE usuario SET username = $1, email = $2, password = $3, foto = $4 WHERE id = $5';
    params = [username, email, hashed, fotoPath, req.session.userId];
  } else {
    query = 'UPDATE usuario SET username = $1, email = $2, foto = $3 WHERE id = $4';
    params = [username, email, fotoPath, req.session.userId];
  }
  await pool.query(query, params);
  res.redirect('/profesor/perfil/editar?guardado=1');
};