function requireUsuarioOProfesor(req, res, next) {
  if (req.session && req.session.userId && (req.session.role === 'alumno' || req.session.role === 'profesor')) {
    return next();
  }
  res.redirect('/auth/login');
}

module.exports = requireUsuarioOProfesor;