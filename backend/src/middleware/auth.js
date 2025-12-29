import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export function authRequired(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing Authorization header' });
  }
  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function signToken(user) {
  const payload = { sub: user.id, email: user.email };
  return jwt.sign(payload, config.jwtSecret, { expiresIn: '7d' });
}
