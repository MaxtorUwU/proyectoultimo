const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const multer = require('multer');
const path = require('path');

// Middleware para proteger rutas admin
function requireAdmin(req, res, next) {
  if (req.session.role === 'admin') return next();
  res.redirect('/admin/login');
}

// Configuración de multer para subir foto de perfil admin
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../public/uploads'));
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, 'admin_' + req.session.userId + '_' + Date.now() + ext);
  }
});
const upload = multer({ storage });

router.get('/login', adminController.loginVista);
router.post('/login', adminController.login);
router.get('/dashboard', requireAdmin, adminController.dashboard);
router.get('/mensajes', requireAdmin, adminController.mensajes);
router.get('/usuarios', requireAdmin, adminController.usuarios);
router.get('/perfil', requireAdmin, adminController.perfilVista);
router.get('/profesores/pendientes', requireAdmin, adminController.profesoresPendientes);

// RUTA PARA EDITAR PERFIL ADMIN (centrado en la vista)
router.get('/perfil/editar', requireAdmin, async (req, res) => {
  const admin = (await require('../db/db').query(
    'SELECT username, email, foto FROM usuario WHERE id = $1',
    [req.session.userId]
  )).rows[0];
  res.render('adminPerfilEditar', { usuario: admin, isAdmin: true, guardado: req.query.guardado === '1' });
});

// POST para editar perfil admin (con foto)
router.post('/perfil', requireAdmin, upload.single('foto'), adminController.perfilEditar);
router.post('/mensajes/eliminar/:id', requireAdmin, adminController.eliminarMensaje);
router.post('/usuarios/eliminar/:id', requireAdmin, adminController.eliminarUsuario);
router.post('/profesores/:id/aprobar', requireAdmin, adminController.aprobarProfesor, (req, res) => {
  res.redirect('/admin/profesores/pendientes?exito=Profesor aprobado');
});
router.post('/profesores/:id/rechazar', requireAdmin, adminController.rechazarProfesor);

module.exports = router;