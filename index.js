const path = require('path');
const express = require('express');
const cors = require('cors');
const session = require('express-session');
require('dotenv').config();

const pool = require('./db/db');

const asignaturasRoutes = require('./routes/asignaturas');
const authRoutes = require('./routes/authRoutes');
const bloquesRoutes = require('./routes/bloques');
const dashboardRoutes = require('./routes/dashboard');
const horarioRoutes = require('./routes/horario');
const ayudaRoutes = require('./routes/ayuda');
const adminRoutes = require('./routes/admin');
const recordatorioRoutes = require('./routes/recordatorio');
const perfilRoutes = require('./routes/perfil');
const misAsignaturasRoutes = require('./routes/mis-asignaturas'); // <-- Agrega esta línea
const profesorRoutes = require('./routes/profesor');
const exphbs = require('express-handlebars');
const requireLogin = require('./middlewares/auth');
const requireUsuarioOProfesor = require('./middlewares/authUsuarioOProfesor');

const app = express();
const PORT = process.env.PORT || 3000;

// Configurar motor de vistas Handlebars con helpers eq, json y capitalize
const hbs = exphbs.create({
  extname: '.hbs',
  helpers: {
    eq: (a, b) => a === b,
    json: context => JSON.stringify(context, null, 2),
    capitalize: str => str ? str.charAt(0).toUpperCase() + str.slice(1) : '',
    hasEvaluacion: function(asigId, evaluaciones, options) {
      if (!evaluaciones) return '';
      return evaluaciones.some(e => String(e.asignatura_id) === String(asigId)) ? options.fn(this) : '';
    },
    fechaBonita: function(fecha) {
      if (!fecha) return '';
      const d = new Date(fecha);
      return d.toLocaleDateString('es-CL');
    }
  },
  partialsDir: path.join(__dirname, 'views', 'partials')
});

app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configurar sesión
app.use(session({
  secret: process.env.SESSION_SECRET || 'mi_clave_secreta',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 2 * 60 * 60 * 1000 } // 2 horas
}));

// Servir archivos estáticos desde 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Landing page (home)
app.get('/', (req, res) => {
  if (req.session && req.session.userId && req.session.role !== 'admin') {
    return res.redirect('/dashboard');
  }
  if (req.session && req.session.userId && req.session.role === 'admin') {
    return res.redirect('/admin/dashboard');
  }
  res.render('home', { isHome: true });
});

// Rutas principales
app.use('/asignaturas', requireUsuarioOProfesor, asignaturasRoutes);
app.use('/mis-asignaturas', requireLogin, misAsignaturasRoutes);
app.use('/dashboard', requireLogin, dashboardRoutes);
app.use('/perfil', requireLogin, perfilRoutes);
app.use('/recordatorio', requireLogin, recordatorioRoutes);
app.use('/horario', requireLogin, horarioRoutes);
app.use('/auth', authRoutes);
app.use('/ayuda', ayudaRoutes);
app.use('/admin', adminRoutes);
app.use('/bloques', bloquesRoutes);
app.use('/profesor', profesorRoutes);

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});