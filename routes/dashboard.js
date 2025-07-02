const express = require('express');
const router = express.Router();
const verificarToken = require('../middlewares/verificarToken');
const { mostrarDashboard } = require('../controllers/dashboardController');

// Ruta protegida para el dashboard
router.get('/', verificarToken, mostrarDashboard);



module.exports = router;