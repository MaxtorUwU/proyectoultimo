const pool = require('../db/db');

function normalizaDia(dia) {
  return dia.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

const mostrarDashboard = async (req, res) => {
  try {
    const asignaturasResult = await pool.query(`
      SELECT a.nombre, a.codigo
      FROM inscripcion i
      JOIN asignatura a ON a.id = i.asignatura_id
      WHERE i.usuario_id = $1
      GROUP BY a.nombre, a.codigo
      ORDER BY a.nombre
    `, [req.session.userId]);

    const result = await pool.query(`
      SELECT a.nombre, a.codigo, h.dia, 
        to_char(h.hora_inicio, 'HH24:MI') as hora_inicio, 
        to_char(h.hora_fin, 'HH24:MI') as hora_fin
      FROM inscripcion i
      JOIN asignatura a ON a.id = i.asignatura_id
      LEFT JOIN asignatura_horario h ON h.asignatura_id = a.id
      WHERE i.usuario_id = $1
    `, [req.session.userId]);

    const bloques = [
      '08:30 - 09:50',
      '10:00 - 11:20',
      '11:30 - 12:50',
      '13:00 - 14:20',
      '14:30 - 15:50',
      '13:00 - 15:50', // <-- agrega este
      '16:00 - 17:20',
      '17:30 - 18:50'
    ];
    const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

    const horario = {};
    for (const bloque of bloques) {
      horario[bloque] = {};
      for (const dia of dias) {
        horario[bloque][dia] = '';
      }
    }

    result.rows.forEach(asig => {
      if (asig.dia && asig.hora_inicio && asig.hora_fin) {
        const hora_inicio = asig.hora_inicio.padStart(5, '0');
        const hora_fin = asig.hora_fin.padStart(5, '0');
        const bloque = `${hora_inicio} - ${hora_fin}`;
        const diaBD = normalizaDia(asig.dia);
        const diaHorario = dias.find(d => normalizaDia(d) === diaBD);

        // Si es un bloque largo, asígnalo a los bloques que cubre
        if (bloque === '13:00 - 15:50' && diaHorario) {
          if (horario['13:00 - 14:20'] && horario['13:00 - 14:20'][diaHorario] !== undefined) {
            horario['13:00 - 14:20'][diaHorario] = `${asig.nombre} (${asig.codigo})`;
          }
          if (horario['14:30 - 15:50'] && horario['14:30 - 15:50'][diaHorario] !== undefined) {
            horario['14:30 - 15:50'][diaHorario] = `${asig.nombre} (${asig.codigo})`;
          }
        } else if (bloques.includes(bloque) && diaHorario && horario[bloque][diaHorario] !== undefined) {
          horario[bloque][diaHorario] = `${asig.nombre} (${asig.codigo})`;
        }
      }
    });

    res.render('dashboard', {
      username: req.session.username,
      horario,
      asignaturas: asignaturasResult.rows,
      isDashboard: true
    });
  } catch (err) {
    console.error('Error al mostrar dashboard:', err);
    res.render('dashboard', { username: req.session.username, horario: {}, asignaturas: [], isDashboard: true });
  }
};

module.exports = { mostrarDashboard };