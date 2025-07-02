const express = require('express');
const router = express.Router();
const profesorController = require('../controllers/profesorController');
const multer = require('multer');
const path = require('path');

// Middleware para proteger rutas de profesor
function requireProfesor(req, res, next) {
  if (req.session && req.session.userId && req.session.role === 'profesor' && req.session.aprobado) {
    return next();
  }
  res.redirect('/auth/login');
}

// Configuración de multer para foto de perfil
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../public/uploads'));
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, 'profesor_' + req.session.userId + '_' + Date.now() + ext);
  }
});
const upload = multer({ storage });

// Dashboard principal
router.get('/dashboard', requireProfesor, profesorController.dashboard);

// Asignaturas
router.get('/asignaturas', requireProfesor, profesorController.asignaturasVista);
router.post('/asignaturas/crear', requireProfesor, profesorController.crearAsignatura);
router.post('/asignaturas/:id/eliminar', profesorController.eliminarAsignatura);

// Alumnos de una asignatura
router.get('/asignaturas/:id/alumnos', requireProfesor, profesorController.alumnosAsignatura);

// Evaluaciones
router.get('/evaluaciones', requireProfesor, profesorController.evaluacionesVista);
router.post('/evaluaciones/crear', requireProfesor, profesorController.crearEvaluacion);
router.post('/evaluaciones/:id/eliminar', profesorController.eliminarEvaluacion);

// Perfil
router.get('/perfil', requireProfesor, profesorController.perfilVista);
router.get('/perfil/editar', profesorController.editarPerfilVista);
router.post('/perfil/editar', upload.single('foto'), profesorController.editarPerfil);

// Logout (opcional, normalmente está en /auth/logout)
router.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/auth/login'));
});

module.exports = router;