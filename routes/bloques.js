const express = require('express');
const router = express.Router();
const verificarToken = require('../middlewares/verificarToken');
const { obtenerBloquesProfesor, crearBloque } = require('../controllers/bloquesController');

router.get('/', verificarToken, obtenerBloquesProfesor);
router.post('/', verificarToken, crearBloque);

module.exports = router;
