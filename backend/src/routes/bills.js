import express from 'express';
import { z } from 'zod';
import { authRequired } from '../middleware/auth.js';
import { query } from '../db.js';

export const billsRouter = express.Router();

const billSchema = z.object({
  name: z.string().min(1).max(255),
  amount: z.number().positive(),
  due_date: z.string().min(1),
  is_recurring: z.boolean().optional().default(false),
  recurrence_rule: z.string().max(255).nullable().optional(),
  paid: z.boolean().optional(),
});

billsRouter.use(authRequired);

billsRouter.get('/', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await query('SELECT * FROM bills WHERE user_id = $1 ORDER BY due_date', [
      userId,
    ]);
    res.json({ items: result.rows });
  } catch (err) {
    next(err);
  }
});

billsRouter.post('/', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const parsed = billSchema.parse(req.body);
    const result = await query(
      'INSERT INTO bills (user_id, name, amount, due_date, is_recurring, recurrence_rule, paid) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [
        userId,
        parsed.name,
        parsed.amount,
        parsed.due_date,
        parsed.is_recurring ?? false,
        parsed.recurrence_rule ?? null,
        parsed.paid ?? false,
      ]
    );
    res.status(201).json({ bill: result.rows[0] });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors.map((e) => e.message).join(', ') });
    }
    next(err);
  }
});

billsRouter.put('/:id', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const parsed = billSchema.partial().parse(req.body);

    const fields = [];
    const params = [userId, id];

    function pushField(column, value) {
      params.push(value);
      fields.push(`${column} = $${params.length}`);
    }

    if (parsed.name !== undefined) pushField('name', parsed.name);
    if (parsed.amount !== undefined) pushField('amount', parsed.amount);
    if (parsed.due_date !== undefined) pushField('due_date', parsed.due_date);
    if (parsed.is_recurring !== undefined) pushField('is_recurring', parsed.is_recurring);
    if (parsed.recurrence_rule !== undefined)
      pushField('recurrence_rule', parsed.recurrence_rule);
    if (parsed.paid !== undefined) pushField('paid', parsed.paid);

    if (!fields.length) return res.status(400).json({ error: 'No fields to update' });

    const sql = `UPDATE bills SET ${fields.join(', ')} WHERE user_id = $1 AND id = $2 RETURNING *`;
    const result = await query(sql, params);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ bill: result.rows[0] });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors.map((e) => e.message).join(', ') });
    }
    next(err);
  }
});

billsRouter.delete('/:id', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const result = await query('DELETE FROM bills WHERE user_id = $1 AND id = $2', [userId, id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Not found' });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// Upcoming bills in a given month (for calendar view)
billsRouter.get('/calendar', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { month } = req.query; // YYYY-MM
    if (!month || typeof month !== 'string') {
      return res.status(400).json({ error: 'month query param (YYYY-MM) required' });
    }
    const result = await query(
      "SELECT * FROM bills WHERE user_id = $1 AND to_char(due_date, 'YYYY-MM') = $2 ORDER BY due_date",
      [userId, month]
    );
    res.json({ items: result.rows });
  } catch (err) {
    next(err);
  }
});
