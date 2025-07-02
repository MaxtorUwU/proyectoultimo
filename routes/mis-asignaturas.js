const express = require('express');
const router = express.Router();
const misAsignaturasController = require('../controllers/misAsignaturasController');

router.get('/', misAsignaturasController.listar);
router.post('/salir', misAsignaturasController.salir);
router.post('/guardar-simulacion', misAsignaturasController.guardarSimulacion);
router.post('/guardar-evaluacion', misAsignaturasController.guardarEvaluacion);
router.post('/eliminar-evaluacion', misAsignaturasController.eliminarEvaluacion);

module.exports = router;