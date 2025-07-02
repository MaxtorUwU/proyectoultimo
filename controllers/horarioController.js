const pool = require('../db/db');
const { DateTime } = require('luxon');

// Función para capitalizar la primera letra
function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

const mostrarHorarioDiario = async (req, res) => {
  try {
    const bloques = [
      '08:30 - 09:50',
      '10:00 - 11:20',
      '11:30 - 12:50',
      '13:00 - 14:20',
      '14:30 - 15:50',
      '16:00 - 17:20',
      '17:30 - 18:50'
    ];

    const hoyChileDT = DateTime.now().setZone('America/Santiago');
    let semanaBaseDT;

    if (req.query.semana) {
      semanaBaseDT = DateTime.fromISO(req.query.semana, { zone: 'America/Santiago' });
      // Si la fecha no es lunes, retrocede hasta el lunes de esa semana
      if (semanaBaseDT.weekday !== 1) {
        semanaBaseDT = semanaBaseDT.startOf('week');
      }
    } else {
      // Si hoy es sábado (6) o domingo (7), avanzar a la próxima semana
      if (hoyChileDT.weekday === 6 || hoyChileDT.weekday === 7) {
        semanaBaseDT = hoyChileDT.plus({ weeks: 1 }).startOf('week'); // lunes próximo
      } else {
        semanaBaseDT = hoyChileDT.startOf('week'); // lunes de esta semana
      }
    }

    const dias = [];
    const diasNombres = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
    for (let i = 0; i < 5; i++) {
      const dia = semanaBaseDT.plus({ days: i });
      dias.push({
        nombre: diasNombres[i],
        fecha: dia.toISODate(),
        label: capitalizeFirst(dia.setLocale('es').toFormat('cccc d/LL'))
      });
    }

    // Consulta SIN la columna sala
    const result = await pool.query(`
      SELECT a.id, a.nombre, a.codigo, h.dia, 
        to_char(h.hora_inicio, 'HH24:MI') as hora_inicio, 
        to_char(h.hora_fin, 'HH24:MI') as hora_fin,
        u.username as profesor
      FROM inscripcion i
      JOIN asignatura a ON a.id = i.asignatura_id
      JOIN asignatura_horario h ON h.asignatura_id = a.id
      LEFT JOIN usuario u ON u.id = a.profesor_id AND u.role = 'profesor'
      WHERE i.usuario_id = $1
    `, [req.session.userId]);

    // Inicializar estructura de horario
    const horario = {};
    for (const bloque of bloques) {
      horario[bloque] = {};
      for (const dia of dias) {
        horario[bloque][dia.fecha] = null;
      }
    }

    // Llenar el horario con las asignaturas inscritas
    result.rows.forEach(asig => {
      const hora_inicio = asig.hora_inicio.padStart(5, '0');
      const hora_fin = asig.hora_fin.padStart(5, '0');
      const bloque = `${hora_inicio} - ${hora_fin}`;
      // Normalizar el nombre del día para evitar problemas de tildes
      const diaAsignatura = asig.dia.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const diaObj = dias.find(d => 
        d.nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '') === diaAsignatura
      );
      if (diaObj && horario[bloque] && horario[bloque][diaObj.fecha] !== undefined) {
        horario[bloque][diaObj.fecha] = {
          nombre: asig.nombre,
          codigo: asig.codigo,
          profesor: asig.profesor || 'No asignado',
          id: asig.id
        };
      }
    });

    // Obtener asignaturas inscritas del usuario
    const asignaturasRes = await pool.query(`
      SELECT a.id, a.nombre
      FROM inscripcion i
      JOIN asignatura a ON a.id = i.asignatura_id
      WHERE i.usuario_id = $1
    `, [req.session.userId]);
    const asignaturas = asignaturasRes.rows;

    // Obtener evaluaciones de la base de datos
    const usuario_id = req.session.userId;
    const semanaInicio = dias[0].fecha;
    const semanaFin = dias[dias.length - 1].fecha;
    const evaluacionesRes = await pool.query(
      `SELECT * FROM evaluacion WHERE usuario_id = $1 AND fecha BETWEEN $2 AND $3`,
      [usuario_id, semanaInicio, semanaFin]
    );
    const evaluaciones = evaluacionesRes.rows;

    // Asocia el nombre de la asignatura a cada evaluación
    evaluaciones.forEach(ev => {
      ev.asignatura_id = String(ev.asignatura_id);
      const asig = asignaturas.find(a => String(a.id) === String(ev.asignatura_id));
      ev.asignatura_nombre = asig ? asig.nombre : 'Asignatura eliminada';
      // Usa zona horaria de Chile
      const dt = DateTime.fromJSDate(new Date(ev.fecha), { zone: 'utc' }).setZone('America/Santiago');
      ev.fechaISO = dt.toISODate(); // YYYY-MM-DD en Chile
      ev.fechaString = dt.setLocale('es-CL').toLocaleString({ year: 'numeric', month: 'short', day: 'numeric' });
    });

    // Filtra evaluaciones eliminadas
    const evaluacionesFiltradas = evaluaciones.filter(ev => ev.asignatura_nombre !== 'Asignatura eliminada');

    // Agrupa evaluaciones por fecha (YYYY-MM-DD)
    const evaluacionesPorDia = {};
    for (const ev of evaluacionesFiltradas) {
      if (!evaluacionesPorDia[ev.fechaISO]) evaluacionesPorDia[ev.fechaISO] = [];
      evaluacionesPorDia[ev.fechaISO].push(ev);
    }

    // Al final de mostrarHorarioDiario, antes de res.render:
    const hoyChile = DateTime.now().setZone('America/Santiago').toISODate();

    res.render('horario', {
      username: req.session.username,
      dias,
      bloques,
      horario,
      semanaBase: req.query.semana ? req.query.semana : dias[0].fecha,
      isDashboard: true,
      evaluaciones: evaluacionesFiltradas,
      evaluacionesPorDia,
      hoyChile
    });
  } catch (err) {
    console.error('Error al mostrar horario diario:', err);
    res.render('horario', { username: req.session.username, dias: [], bloques: [], horario: {}, semanaBase: '', isDashboard: true });
  }
};

module.exports = { mostrarHorarioDiario };