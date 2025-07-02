const express = require('express');
const router = express.Router();
const verificarToken = require('../middlewares/verificarToken');
const { mostrarHorarioDiario } = require('../controllers/horarioController');

router.get('/', verificarToken, mostrarHorarioDiario);

module.exports = router;