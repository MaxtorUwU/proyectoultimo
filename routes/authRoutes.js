const express = require('express');
const router = express.Router();
const { 
  login, register, olvidoVista, olvidoEnviar, 
  restablecerVista, restablecerGuardar 
} = require('../controllers/authController');

// Mostrar formulario de login
router.get('/login', (req, res) => {
  const successMessage = req.session.successMessage;
  req.session.successMessage = null; // Limpia el mensaje después de mostrarlo
  res.render('login', { error: null, successMessage, showHomeOnly: true });
});

// Procesar login (POST)
router.post('/login', login);

// Mostrar formulario de registro
router.get('/register', (req, res) => {
  res.render('register', { error: null, successMessage: null, oldData: {}, showHomeOnly: true });
});

// Procesar registro (POST)
router.post('/register', register);

// Mostrar formulario de olvido de contraseña
router.get('/olvido', olvidoVista);

// Procesar envío de olvido de contraseña
router.post('/olvido', olvidoEnviar);

// Mostrar formulario para restablecer contraseña (GET)
router.get('/restablecer/:token', restablecerVista);

// Procesar nueva contraseña (POST)
router.post('/restablecer/:token', restablecerGuardar);

router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

module.exports = router;