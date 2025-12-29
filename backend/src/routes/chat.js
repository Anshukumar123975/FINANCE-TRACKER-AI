import express from 'express';
import { z } from 'zod';
import { authRequired } from '../middleware/auth.js';
import { query } from '../db.js';
import { runAgent } from '../services/agent.js';

export const chatRouter = express.Router();

const chatSchema = z.object({
  message: z.string().min(1),
});

chatRouter.use(authRequired);

chatRouter.post('/', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const parsed = chatSchema.parse(req.body);

    const response = await runAgent({ userId, message: parsed.message });
    res.json(response);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors.map((e) => e.message).join(', ') });
    }
    next(err);
  }
});
