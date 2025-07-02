const pool = require('../db/db');

exports.listar = async (req, res) => {
  try {
    const usuario_id = req.session.userId;
    const result = await pool.query(`
      SELECT a.*, 
        u.username AS profesor,
        COALESCE(
          (
            SELECT json_agg(json_build_object('dia', h.dia, 'hora_inicio', to_char(h.hora_inicio, 'HH24:MI'), 'hora_fin', to_char(h.hora_fin, 'HH24:MI')))
            FROM asignatura_horario h WHERE h.asignatura_id = a.id
          ), '[]'
        ) AS horarios
      FROM inscripcion i
      JOIN asignatura a ON i.asignatura_id = a.id
      LEFT JOIN usuario u ON a.profesor_id = u.id
      WHERE i.usuario_id = $1
      ORDER BY a.nombre, a.seccion
    `, [usuario_id]);

    // Traer todas las evaluaciones futuras del usuario
    const hoy = new Date().toISOString().slice(0,10);
    const evaluacionesRes = await pool.query(
      `SELECT e.*
         FROM evaluacion e
         WHERE e.usuario_id = $1
           AND e.asignatura_id IN (SELECT asignatura_id FROM inscripcion WHERE usuario_id = $1)
           AND e.fecha >= CURRENT_DATE
         ORDER BY e.fecha ASC
      `,
      [req.session.userId]
    );
    const evaluaciones = evaluacionesRes.rows;

    // Agregar campo fecha legible a cada evaluación
    evaluaciones.forEach(ev => {
      const d = new Date(ev.fecha);
      ev.fechaString = d.toLocaleDateString('es-CL', { year: 'numeric', month: 'short', day: 'numeric' });
    });

    // Asignar la próxima evaluación a cada asignatura
    const asignaturas = result.rows.map(a => {
      const evals = evaluaciones
        .filter(ev => String(ev.asignatura_id) === String(a.id))
        .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
      let proximaEvaluacion = null;
      if (evals.length) {
        const prox = evals[0];
        proximaEvaluacion = {
          id: prox.id,
          nombre: prox.nombre,
          tipo: prox.tipo,
          fecha: prox.fecha,
          fechaString: prox.fechaString
        };
      }
      return {
        ...a,
        horarios: Array.isArray(a.horarios) ? a.horarios : [],
        proximaEvaluacion
      };
    });

    const mensaje = req.session.mensaje || '';
    const tipoMensaje = req.session.tipoMensaje || '';
    req.session.mensaje = '';
    req.session.tipoMensaje = '';

    res.render('mis-asignaturas', { 
      asignaturas,
      mensaje,
      tipoMensaje,
      isDashboard: true
    });
  } catch (err) {
    console.error('Error al obtener mis asignaturas:', err);
    res.status(500).render('mis-asignaturas', { asignaturas: [], mensaje: 'Error al obtener asignaturas', tipoMensaje: 'error', isDashboard: true });
  }
};

exports.salir = async (req, res) => {
  const usuario_id = req.session.userId;
  const asignatura_id = req.body.asignatura_id;

  try {
    await pool.query(
      'DELETE FROM inscripcion WHERE usuario_id = $1 AND asignatura_id = $2',
      [usuario_id, asignatura_id]
    );
    const asig = await pool.query(
      'SELECT creditos FROM asignatura WHERE id = $1',
      [asignatura_id]
    );
    const creditos = asig.rows[0]?.creditos ?? 0;
    await pool.query(
      'UPDATE asignatura SET cupos = cupos + 1 WHERE id = $1',
      [asignatura_id]
    );
    await pool.query(
      'UPDATE usuario SET creditos_disponibles = creditos_disponibles + $1 WHERE id = $2',
      [creditos, usuario_id]
    );
    req.session.mensaje = 'Asignatura retirada correctamente.';
    req.session.tipoMensaje = 'success';
    res.redirect('/mis-asignaturas');
  } catch (err) {
    console.error('Error al salir de la asignatura:', err);
    req.session.mensaje = 'Error inesperado.';
    req.session.tipoMensaje = 'error';
    res.redirect('/mis-asignaturas');
  }
};

exports.guardarSimulacion = async (req, res) => {
  try {
    const usuario_id = req.session.userId;
    const { asignatura_id, evaluaciones } = req.body;
    if (!asignatura_id || !Array.isArray(evaluaciones) || !usuario_id) {
      return res.json({ ok: false, error: 'Datos incompletos' });
    }
    // Inserta o actualiza la simulación
    await pool.query(
      `INSERT INTO simulacion_nota (usuario_id, asignatura_id, evaluaciones, fecha)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (usuario_id, asignatura_id)
       DO UPDATE SET evaluaciones = EXCLUDED.evaluaciones, fecha = NOW()`,
      [usuario_id, asignatura_id, JSON.stringify(evaluaciones)]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('Error al guardar simulación:', err);
    res.json({ ok: false, error: 'Error en el servidor' });
  }
};

exports.guardarEvaluacion = async (req, res) => {
  try {
    const usuario_id = req.session.userId;
    const { asignatura_id, nombre, tipo, fecha, descripcion } = req.body;
    if (!usuario_id || !asignatura_id || !nombre || !tipo || !fecha) {
      return res.json({ ok: false, error: 'Datos incompletos' });
    }
    await pool.query(
      `INSERT INTO evaluacion (usuario_id, asignatura_id, nombre, tipo, fecha, descripcion)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [usuario_id, asignatura_id, nombre, tipo, fecha, descripcion || '']
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('Error al guardar evaluación:', err);
    res.json({ ok: false, error: 'Error en el servidor' });
  }
};

exports.eliminarEvaluacion = async (req, res) => {
  try {
    const usuario_id = req.session.userId;
    const { id } = req.body;
    await pool.query('DELETE FROM evaluacion WHERE id = $1 AND usuario_id = $2', [id, usuario_id]);
    res.json({ ok: true });
  } catch (err) {
    res.json({ ok: false });
  }
};

exports.misAsignaturas = async (req, res) => {
  const usuario_id = req.session.userId;
  // Obtén las asignaturas y evaluaciones del usuario
  const asignaturas = (await pool.query('SELECT * FROM asignatura WHERE ...')).rows;
  const evaluaciones = (await pool.query('SELECT e.* FROM evaluacion e WHERE e.usuario_id = $1 AND e.asignatura_id IN (SELECT asignatura_id FROM inscripcion WHERE usuario_id = $1) AND e.fecha >= CURRENT_DATE ORDER BY e.fecha ASC', [req.session.userId])).rows;

  // Asigna la próxima evaluación a cada asignatura
  asignaturas.forEach(asig => {
    const evals = evaluaciones
      .filter(ev => String(ev.asignatura_id) === String(asig.id))
      .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    if (evals.length) {
      const prox = evals[0];
      const d = new Date(prox.fecha);
      asig.proximaEvaluacion = {
        id: prox.id,
        nombre: prox.nombre,
        tipo: prox.tipo,
        fecha: prox.fecha,
        fechaString: d.toLocaleDateString('es-CL', { year: 'numeric', month: 'short', day: 'numeric' })
      };
    }
  });

  // Renderiza la vista con las asignaturas (cada una con proximaEvaluacion si corresponde)
  res.render('mis-asignaturas', { asignaturas });
};