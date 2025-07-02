function requireLogin(req, res, next) {
  if (req.session && req.session.userId && req.session.role === 'alumno') {
    return next();
  }
  res.redirect('/auth/login');
}
module.exports = requireLogin;