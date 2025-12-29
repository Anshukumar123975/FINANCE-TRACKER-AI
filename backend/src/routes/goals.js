import express from 'express';
import { z } from 'zod';
import { authRequired } from '../middleware/auth.js';
import { query } from '../db.js';

export const goalsRouter = express.Router();

const goalSchema = z.object({
  name: z.string().min(1).max(255),
  target_amount: z.number().positive(),
  current_amount: z.number().nonnegative().optional(),
  target_date: z.string().min(1),
});

goalsRouter.use(authRequired);

goalsRouter.get('/', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await query('SELECT * FROM goals WHERE user_id = $1 ORDER BY target_date', [
      userId,
    ]);
    res.json({ items: result.rows });
  } catch (err) {
    next(err);
  }
});

goalsRouter.post('/', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const parsed = goalSchema.parse(req.body);
    const result = await query(
      'INSERT INTO goals (user_id, name, target_amount, current_amount, target_date) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [
        userId,
        parsed.name,
        parsed.target_amount,
        parsed.current_amount ?? 0,
        parsed.target_date,
      ]
    );
    res.status(201).json({ goal: result.rows[0] });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors.map((e) => e.message).join(', ') });
    }
    next(err);
  }
});

goalsRouter.put('/:id', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const parsed = goalSchema.partial().parse(req.body);

    const fields = [];
    const params = [userId, id];

    function pushField(column, value) {
      params.push(value);
      fields.push(`${column} = $${params.length}`);
    }

    if (parsed.name !== undefined) pushField('name', parsed.name);
    if (parsed.target_amount !== undefined) pushField('target_amount', parsed.target_amount);
    if (parsed.current_amount !== undefined) pushField('current_amount', parsed.current_amount);
    if (parsed.target_date !== undefined) pushField('target_date', parsed.target_date);

    if (!fields.length) return res.status(400).json({ error: 'No fields to update' });

    const sql = `UPDATE goals SET ${fields.join(', ')} WHERE user_id = $1 AND id = $2 RETURNING *`;
    const result = await query(sql, params);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ goal: result.rows[0] });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors.map((e) => e.message).join(', ') });
    }
    next(err);
  }
});

goalsRouter.delete('/:id', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const result = await query('DELETE FROM goals WHERE user_id = $1 AND id = $2', [userId, id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Not found' });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
