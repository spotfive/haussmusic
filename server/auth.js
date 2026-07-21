const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is required. Set it in server/.env (see .env.example).');
}

function signToken(userId) {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: '30d' });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET).sub;
}

// Attaches req.userId when a valid Bearer token is present; never rejects
// by itself, so public routes still work — routes that need a session
// check req.userId themselves (see requireAuth).
function attachUser(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    try {
      req.userId = verifyToken(token);
    } catch {
      req.userId = null;
    }
  }
  next();
}

function requireAuth(req, res, next) {
  if (!req.userId) return res.status(401).json({ error: 'Not authenticated' });
  next();
}

module.exports = { signToken, verifyToken, attachUser, requireAuth };
