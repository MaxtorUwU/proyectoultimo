const nodemailer = require('nodemailer');
const crypto = require('crypto');
const pool = require('../db/db');
const bcrypt = require('bcrypt');

// LOGIN para tabla única 'usuario'
const login = async (req, res) => {
  const { usernameOrEmail, password } = req.body;

  if (!usernameOrEmail || !password) {
    return res.render('login', { error: 'Credenciales inválidas' });
  }

  try {
    // Buscar usuario por username o email
    const result = await pool.query(
      'SELECT * FROM usuario WHERE username = $1 OR email = $1',
      [usernameOrEmail]
    );
    const usuario = result.rows[0];

    // Si no existe usuario o la contraseña no coincide, mostrar mensaje genérico
    if (!usuario) {
      return res.render('login', { error: 'Credenciales inválidas' });
    }

    const match = await bcrypt.compare(password, usuario.password_hash);
    if (!match) {
      return res.render('login', { error: 'Credenciales inválidas' });
    }

    // Guardar datos en sesión
    req.session.userId = usuario.id;
    req.session.username = usuario.username;
    req.session.email = usuario.email; // <-- añade esto
    req.session.role = usuario.role;
    req.session.aprobado = usuario.aprobado; // para profesores

    if (usuario.role === 'admin') return res.redirect('/admin/dashboard');
    if (usuario.role === 'profesor') {
      if (!usuario.aprobado) return res.render('profesorPendiente', { usuario });
      return res.redirect('/profesor/dashboard');
    }
    return res.redirect('/dashboard'); // alumno
  } catch (err) {
    console.error('Error en login:', err);
    res.render('login', { error: 'Error interno del servidor' });
  }
};

// REGISTRO para tabla única 'usuario'
const register = async (req, res) => {
  const { username, email, password, confirmPassword, role, acceptTerms } = req.body;

  // Validar campos obligatorios y aceptación términos
  if (!username || !email || !password || !confirmPassword || !role || !acceptTerms) {
    return res.render('register', { error: 'Faltan datos obligatorios o no aceptaste términos', oldData: req.body });
  }

  if (password !== confirmPassword) {
    return res.render('register', { error: 'Las contraseñas no coinciden', oldData: req.body });
  }

  if (password.length < 6) {
    return res.render('register', { error: 'La contraseña debe tener al menos 6 caracteres', oldData: req.body });
  }

  if (!['alumno', 'profesor'].includes(role)) {
    return res.render('register', { error: 'Tipo de usuario inválido', oldData: req.body });
  }

  try {
    // Verificar que username o email no existan
    const existUser = await pool.query(
      'SELECT 1 FROM usuario WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existUser.rowCount > 0) {
      return res.render('register', { error: 'Usuario o email ya registrado', oldData: req.body });
    }

    // Hashear contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insertar en la tabla usuario
    await pool.query(
      'INSERT INTO usuario (username, email, password_hash, role) VALUES ($1, $2, $3, $4)',
      [username, email, hashedPassword, role]
    );

    // Guardar mensaje en sesión y redirigir al login
    req.session.successMessage = '¡Registro exitoso! Ahora puedes iniciar sesión.';
    return res.redirect('/auth/login');
  } catch (err) {
    console.error('Error en registro:', err);
    res.render('register', { error: 'Error interno del servidor', oldData: req.body });
  }
};

const olvidoVista = (req, res) => {
  res.render('authOlvido');
};

const olvidoEnviar = async (req, res) => {
  const { email } = req.body;
  const user = (await pool.query('SELECT id FROM usuario WHERE email = $1', [email])).rows[0];
  if (!user) {
    return res.render('authOlvido', { mensaje: 'Si el correo existe, recibirás un enlace.' });
  }
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 1000 * 60 * 30); // 30 minutos

  await pool.query('UPDATE usuario SET reset_token = $1, reset_expires = $2 WHERE id = $3', [token, expires, user.id]);

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'matias.mora1@mail.udp.cl',
      pass: 'fbbf zwek aftd yvyy'
    }
  });

  const resetUrl = `http://${req.headers.host}/auth/restablecer/${token}`;
  await transporter.sendMail({
    to: email,
    subject: 'Recupera tu contraseña',
    html: `<p>Haz clic en el siguiente enlace para restablecer tu contraseña:</p>
           <p><a href="${resetUrl}">${resetUrl}</a></p>
           <p>Este enlace expirará en 30 minutos.</p>`
  });

  res.render('authOlvido', { mensaje: 'Si el correo existe, recibirás un enlace.' });
};

const restablecerVista = async (req, res) => {
  const { token } = req.params;
  const user = (await pool.query('SELECT id FROM usuario WHERE reset_token = $1 AND reset_expires > NOW()', [token])).rows[0];
  if (!user) return res.send('Enlace inválido o expirado.');
  res.render('authRestablecer', { token });
};

const restablecerGuardar = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;
  const user = (await pool.query('SELECT id FROM usuario WHERE reset_token = $1 AND reset_expires > NOW()', [token])).rows[0];
  if (!user) return res.send('Enlace inválido o expirado.');
  const hashed = await bcrypt.hash(password, 10);
  await pool.query('UPDATE usuario SET password_hash = $1, reset_token = NULL, reset_expires = NULL WHERE id = $2', [hashed, user.id]);
  res.redirect('/auth/login');
};

module.exports = {
  login,
  register,
  olvidoVista,
  olvidoEnviar,
  restablecerVista,
  restablecerGuardar
};