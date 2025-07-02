const express = require('express');
const router = express.Router();
const pool = require('../db/db');

router.get('/', (req, res) => {
  const usuario = req.session.userId
    ? { username: req.session.username, email: req.session.email }
    : null;
  res.render('ayuda', { isDashboard: false, enviado: false, usuario });
});

router.post('/', async (req, res) => {
  const userId = req.session.userId || null;
  const usuario = req.session.userId
    ? { username: req.session.username, email: req.session.email }
    : null;
  const mensaje = req.body.mensaje;
  await pool.query(
    'INSERT INTO contacto (usuario_id, mensaje, fecha) VALUES ($1, $2, NOW())',
    [userId, mensaje]
  );
  res.render('ayuda', { isDashboard: false, enviado: true, usuario });
});

module.exports = router;