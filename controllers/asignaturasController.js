const pool = require('../db/db');

// Utilidad para filtrar duplicados exactos (nombre, seccion, codigo, profesor, horarios)
function asignaturaKey(a) {
  const horariosKey = (a.horarios || [])
    .map(h => `${h.dia}|${h.hora_inicio}|${h.hora_fin}`)
    .sort()
    .join(';');
  return `${a.nombre}|${a.seccion}|${a.codigo}|${a.profesor || '-' }|${horariosKey}`;
}

exports.obtenerAsignaturas = async (req, res) => {
  try {
    const userId = req.session.userId;
    const q = ((req.query && req.query.q) || (req.body && req.body.q) || '').trim();
    const page = parseInt((req.query && req.query.page) || (req.body && req.body.page) || 1);
    const pageSize = 10;
    const offset = (page - 1) * pageSize;

    // Créditos disponibles del usuario
    const userRes = await pool.query('SELECT creditos_disponibles FROM usuario WHERE id = $1', [userId]);
    const creditos_disponibles = userRes.rows[0]?.creditos_disponibles ?? 0;

    // Total asignaturas para paginación (con filtro, insensible a tildes)
    const totalRes = await pool.query(
      `SELECT COUNT(*) FROM asignatura a
       LEFT JOIN usuario u ON a.profesor_id = u.id
       WHERE unaccent(lower(a.nombre)) LIKE unaccent(lower($1))
         OR unaccent(lower(a.codigo)) LIKE unaccent(lower($1))
         OR unaccent(lower(COALESCE(u.username, ''))) LIKE unaccent(lower($1))`,
      [`%${q}%`]
    );
    const total = parseInt(totalRes.rows[0].count);
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    // Asignaturas con profesor y horarios (insensible a tildes)
    const result = await pool.query(`
      SELECT a.*, 
        u.username AS profesor,
        COALESCE(
          (
            SELECT json_agg(json_build_object('dia', h.dia, 'hora_inicio', to_char(h.hora_inicio, 'HH24:MI'), 'hora_fin', to_char(h.hora_fin, 'HH24:MI')))
            FROM asignatura_horario h WHERE h.asignatura_id = a.id
          ), '[]'
        ) AS horarios
      FROM asignatura a
      LEFT JOIN usuario u ON a.profesor_id = u.id
      WHERE unaccent(lower(a.nombre)) LIKE unaccent(lower($1))
        OR unaccent(lower(a.codigo)) LIKE unaccent(lower($1))
        OR unaccent(lower(COALESCE(u.username, ''))) LIKE unaccent(lower($1))
      ORDER BY a.nombre, a.seccion
      LIMIT $2 OFFSET $3
    `, [`%${q}%`, pageSize, offset]);

    // Traer inscripciones del usuario
    const insc = await pool.query(
      'SELECT asignatura_id FROM inscripcion WHERE usuario_id = $1',
      [userId]
    );
    const inscritas = insc.rows.map(r => r.asignatura_id);

    // Marca si está inscrito y asegura que horarios sea un array
    let asignaturas = result.rows.map(a => ({
      ...a,
      inscrito: inscritas.includes(a.id),
      horarios: Array.isArray(a.horarios) ? a.horarios : [],
      creditos: a.creditos,
      profesor: a.profesor // puede ser null
    }));

    // Filtrar duplicados exactos
    const asignaturasUnicas = [];
    const seen = new Set();
    for (const a of asignaturas) {
      const key = asignaturaKey(a);
      if (!seen.has(key)) {
        seen.add(key);
        asignaturasUnicas.push(a);
      }
    }

    // Pasa el usuario completo para el navbar
    const usuario = req.session.usuario || { creditos_disponibles };

    const mensaje = req.session.mensaje || '';
    const tipoMensaje = req.session.tipoMensaje || '';
    req.session.mensaje = '';
    req.session.tipoMensaje = '';

    res.render('asignaturas', {
      asignaturas: asignaturasUnicas,
      usuario,
      q,
      page,
      totalPages,
      hasPrev: page > 1,
      hasNext: page < totalPages,
      prevPage: page - 1,
      nextPage: page + 1,
      mensaje,
      tipoMensaje,
      isDashboard: true
    });
  } catch (err) {
    console.error('Error al obtener asignaturas:', err);
    res.status(500).render('asignaturas', { asignaturas: [], error: 'Error al obtener asignaturas' });
  }
};

// Utilidad para redirigir con mensaje y mantener filtros
function redirectWithMsg(req, res, msg, tipo) {
  req.session.mensaje = msg;
  req.session.tipoMensaje = tipo;
  const q = req.body.q ? `q=${encodeURIComponent(req.body.q)}` : '';
  const page = req.body.page ? `page=${encodeURIComponent(req.body.page)}` : '';
  const params = [q, page].filter(Boolean).join('&');
  res.redirect('/asignaturas' + (params ? `?${params}` : ''));
}

// Inscribir asignatura y descontar créditos
exports.inscribirAsignatura = async (req, res) => {
  const usuario_id = req.session.userId;
  const asignatura_id = req.body.asignatura_id;

  try {
    // 1. Obtener datos de la asignatura a inscribir
    const asigRes = await pool.query(
      `SELECT id, nombre, codigo, creditos, cupos FROM asignatura WHERE id = $1`, [asignatura_id]
    );
    const asignatura = asigRes.rows[0];

    // 2. Obtener créditos del usuario
    const userRes = await pool.query(
      'SELECT creditos_disponibles FROM usuario WHERE id = $1', [usuario_id]
    );
    const creditos_disponibles = userRes.rows[0]?.creditos_disponibles ?? 0;

    // 3. Verifica cupos y créditos primero (retorna si falla)
    if (!asignatura || asignatura.cupos <= 0) {
      return redirectWithMsg(req, res, 'No hay cupos disponibles.', 'error');
    }
    if (Number(asignatura.creditos) > Number(creditos_disponibles)) {
      return redirectWithMsg(req, res, 'No tienes créditos suficientes.', 'error');
    }

    // 4. No permitir más de un "Inglés III" (insensible a tildes)
    if (asignatura.nombre.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes('ingles iii')) {
      const yaTiene = await pool.query(
        `SELECT 1 FROM inscripcion i
         JOIN asignatura a ON i.asignatura_id = a.id
         WHERE i.usuario_id = $1 AND unaccent(lower(a.nombre)) LIKE unaccent(lower('%ingles iii%'))`,
        [usuario_id]
      );
      if (yaTiene.rowCount > 0) {
        return redirectWithMsg(req, res, 'Ya tienes inscrito Inglés III.', 'error');
      }
    }

    // 4. No permitir inscribir dos veces una asignatura con el mismo código
    const yaTieneCodigo = await pool.query(
      `SELECT 1 FROM inscripcion i
       JOIN asignatura a ON i.asignatura_id = a.id
       WHERE i.usuario_id = $1
         AND a.codigo = $2`,
      [usuario_id, asignatura.codigo]
    );
    if (yaTieneCodigo.rowCount > 0) {
      return redirectWithMsg(req, res, 'Ya estás cursando esta asignatura.', 'error');
    }

    // 5. No permitir cruce de horario
    const horariosNueva = await pool.query(
      `SELECT dia, hora_inicio, hora_fin FROM asignatura_horario WHERE asignatura_id = $1`, [asignatura_id]
    );
    const horariosInscritas = await pool.query(
      `SELECT h.dia, h.hora_inicio, h.hora_fin
       FROM inscripcion i
       JOIN asignatura_horario h ON i.asignatura_id = h.asignatura_id
       WHERE i.usuario_id = $1`, [usuario_id]
    );
    for (const hNueva of horariosNueva.rows) {
      for (const hTomada of horariosInscritas.rows) {
        if (
          hNueva.dia === hTomada.dia &&
          (hNueva.hora_inicio < hTomada.hora_fin && hNueva.hora_fin > hTomada.hora_inicio)
        ) {
          return redirectWithMsg(req, res, 'Tienes un cruce de horario.', 'error');
        }
      }
    }

    // 6. Verifica si ya está inscrito
    const ya = await pool.query(
      'SELECT 1 FROM inscripcion WHERE usuario_id = $1 AND asignatura_id = $2',
      [usuario_id, asignatura_id]
    );
    if (ya.rowCount > 0) {
      return redirectWithMsg(req, res, 'Ya estás inscrito en esta asignatura.', 'error');
    }

    // 7. Inscribe, descuenta cupo y descuenta créditos
    await pool.query(
      'INSERT INTO inscripcion (usuario_id, asignatura_id) VALUES ($1, $2)',
      [usuario_id, asignatura_id]
    );
    await pool.query(
      'UPDATE asignatura SET cupos = cupos - 1 WHERE id = $1',
      [asignatura_id]
    );
    await pool.query(
      'UPDATE usuario SET creditos_disponibles = creditos_disponibles - $1 WHERE id = $2',
      [asignatura.creditos, usuario_id]
    );

    return redirectWithMsg(req, res, 'Asignatura inscrita correctamente.', 'success');
  } catch (err) {
    console.error('Error al inscribir:', err);
    return redirectWithMsg(req, res, 'Error inesperado.', 'error');
  }
};

// Salir de asignatura y devolver créditos
exports.salirAsignatura = async (req, res) => {
  const usuario_id = req.session.userId;
  const asignatura_id = req.body.asignatura_id;

  try {
    // Elimina la inscripción
    await pool.query(
      'DELETE FROM inscripcion WHERE usuario_id = $1 AND asignatura_id = $2',
      [usuario_id, asignatura_id]
    );
    // Devuelve el cupo y los créditos
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
    // Mensaje de éxito al salir
    return redirectWithMsg(req, res, 'Asignatura retirada correctamente.', 'success');
  } catch (err) {
    console.error('Error al salir de la asignatura:', err);
    return redirectWithMsg(req, res, 'Error inesperado.', 'error');
  }
};