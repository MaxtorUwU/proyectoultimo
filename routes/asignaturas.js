const express = require('express');
const router = express.Router();
const controller = require('../controllers/asignaturasController');

router.get('/', controller.obtenerAsignaturas);
router.post('/inscribir', controller.inscribirAsignatura);
router.post('/salir', controller.salirAsignatura);

module.exports = router;