const verificarToken = (req, res, next) => {
  // Si el usuario ya está autenticado por sesión, permite el acceso
  if (req.session && req.session.userId) {
    return next();
  }

  // Si quieres seguir permitiendo JWT, puedes dejar este bloque:
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  // Si usas JWT, descomenta y configura esto:
  /*
  const jwt = require('jsonwebtoken');
  jwt.verify(token, process.env.JWT_SECRET, (err, usuario) => {
    if (err) return res.status(403).json({ error: 'Token inválido' });
    req.usuario = usuario;
    next();
  });
  */
};

module.exports = verificarToken;