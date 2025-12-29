import express from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { query } from '../db.js';
import { authRequired, signToken } from '../middleware/auth.js';

export const authRouter = express.Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

const loginSchema = registerSchema;

authRouter.post('/register', async (req, res, next) => {
  try {
    const parsed = registerSchema.parse(req.body);
    const existing = await query('SELECT id FROM users WHERE email = $1', [parsed.email]);
    if (existing.rowCount > 0) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    const passwordHash = await bcrypt.hash(parsed.password, 10);
    const result = await query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
      [parsed.email, passwordHash]
    );

    const user = result.rows[0];
    const token = signToken(user);
    res.status(201).json({ token, user });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors.map((e) => e.message).join(', ') });
    }
    next(err);
  }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const parsed = loginSchema.parse(req.body);
    const result = await query('SELECT id, email, password_hash FROM users WHERE email = $1', [
      parsed.email,
    ]);
    if (result.rowCount === 0) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }
    const user = result.rows[0];
    const ok = await bcrypt.compare(parsed.password, user.password_hash);
    if (!ok) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }
    const token = signToken(user);
    res.json({ token, user: { id: user.id, email: user.email } });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors.map((e) => e.message).join(', ') });
    }
    next(err);
  }
});

authRouter.get('/me', authRequired, async (req, res, next) => {
  try {
    const result = await query('SELECT id, email, created_at FROM users WHERE id = $1', [
      req.user.id,
    ]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user: result.rows[0] });
  } catch (err) {
    next(err);
  }
});
