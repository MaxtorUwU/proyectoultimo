const express = require('express');
const router = express.Router();
const recordatorioController = require('../controllers/recordatorioController');

router.get('/', recordatorioController.getRecordatorios);
router.post('/', recordatorioController.createRecordatorio);
router.delete('/:id', recordatorioController.deleteRecordatorio);

module.exports = router;