const express = require('express');
const router = express.Router();
const perfilController = require('../controllers/perfilController');
const multer = require('multer');
const path = require('path');

// Configuración de multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../public/uploads'));
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, 'user_' + req.session.userId + '_' + Date.now() + ext);
  }
});
const upload = multer({ storage });

router.get('/', perfilController.verPerfil);
router.get('/editar', perfilController.editarPerfilVista);
router.post('/editar', upload.single('foto'), perfilController.editarPerfil);

module.exports = router;