const express = require('express');
const router = express.Router();
const verificarToken = require('../middlewares/verificarToken');
const {
  crearInscripcion,
  obtenerInscripciones,
  eliminarInscripcion,
  obtenerInscripcionesPorAsignatura
} = require('../controllers/inscripcionesController');

router.post('/', verificarToken, crearInscripcion);
router.get('/', verificarToken, obtenerInscripciones);
router.delete('/:id', verificarToken, eliminarInscripcion);
router.get('/asignatura/:id', verificarToken, obtenerInscripcionesPorAsignatura);

module.exports = router;

