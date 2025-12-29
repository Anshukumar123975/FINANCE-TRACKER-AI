import express from 'express';
import { z } from 'zod';
import { authRequired } from '../middleware/auth.js';
import { query } from '../db.js';

export const budgetsRouter = express.Router();

const budgetSchema = z.object({
  category_id: z.number().int().positive().nullable().optional(),
  monthly_limit: z.number().positive(),
  month: z.string().regex(/^\d{4}-\d{2}$/), // YYYY-MM
});

budgetsRouter.use(authRequired);

budgetsRouter.get('/', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await query('SELECT * FROM budgets WHERE user_id = $1 ORDER BY month DESC', [
      userId,
    ]);
    res.json({ items: result.rows });
  } catch (err) {
    next(err);
  }
});

budgetsRouter.post('/', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const parsed = budgetSchema.parse(req.body);
    const result = await query(
      'INSERT INTO budgets (user_id, category_id, monthly_limit, month) VALUES ($1,$2,$3,$4) RETURNING *',
      [userId, parsed.category_id ?? null, parsed.monthly_limit, parsed.month]
    );
    res.status(201).json({ budget: result.rows[0] });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors.map((e) => e.message).join(', ') });
    }
    next(err);
  }
});

budgetsRouter.put('/:id', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const parsed = budgetSchema.partial().parse(req.body);

    const fields = [];
    const params = [userId, id];

    function pushField(column, value) {
      params.push(value);
      fields.push(`${column} = $${params.length}`);
    }

    if (parsed.category_id !== undefined) pushField('category_id', parsed.category_id);
    if (parsed.monthly_limit !== undefined) pushField('monthly_limit', parsed.monthly_limit);
    if (parsed.month !== undefined) pushField('month', parsed.month);

    if (!fields.length) return res.status(400).json({ error: 'No fields to update' });

    const sql = `UPDATE budgets SET ${fields.join(', ')} WHERE user_id = $1 AND id = $2 RETURNING *`;
    const result = await query(sql, params);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ budget: result.rows[0] });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors.map((e) => e.message).join(', ') });
    }
    next(err);
  }
});

budgetsRouter.delete('/:id', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const result = await query('DELETE FROM budgets WHERE user_id = $1 AND id = $2', [userId, id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Not found' });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// Budget status with utilization and color
budgetsRouter.get('/status/current', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const budgetsRes = await query(
      'SELECT b.*, c.name AS category_name FROM budgets b LEFT JOIN categories c ON b.category_id = c.id WHERE b.user_id = $1 AND b.month = $2',
      [userId, month]
    );

    const spentRes = await query(
      "SELECT COALESCE(category_id, 0) AS category_id, SUM(amount) AS spent FROM transactions WHERE user_id = $1 AND type = 'expense' AND to_char(date, 'YYYY-MM') = $2 GROUP BY COALESCE(category_id, 0)",
      [userId, month]
    );

    const spentMap = new Map();
    for (const row of spentRes.rows) {
      spentMap.set(row.category_id, Number(row.spent));
    }

    const items = budgetsRes.rows.map((b) => {
      const key = b.category_id ?? 0;
      const spent = spentMap.get(key) || 0;
      const utilization = b.monthly_limit > 0 ? spent / Number(b.monthly_limit) : 0;
      let status = 'green';
      if (utilization >= 0.9) status = 'red';
      else if (utilization >= 0.7) status = 'yellow';
      return {
        ...b,
        spent,
        utilization,
        status,
      };
    });

    res.json({ month, items });
  } catch (err) {
    next(err);
  }
});
