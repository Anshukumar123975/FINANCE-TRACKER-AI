import express from 'express';
import { z } from 'zod';
import { authRequired } from '../middleware/auth.js';
import { query } from '../db.js';

export const transactionsRouter = express.Router();

const baseSchema = z.object({
  amount: z.number().positive(),
  type: z.enum(['income', 'expense']),
  category_id: z.number().int().positive().nullable().optional(),
  merchant: z.string().max(255).nullable().optional(),
  description: z.string().max(500).nullable().optional(),
  date: z.string().min(1),
  receipt_url: z.string().url().nullable().optional(),
});

const createSchema = baseSchema;
const updateSchema = baseSchema.partial();

// Simple keyword-based auto-categorization
const merchantCategoryMap = {
  swiggy: { type: 'expense', name: 'Food & Dining' },
  uber: { type: 'expense', name: 'Transport' },
  amazon: { type: 'expense', name: 'Shopping' },
  salary: { type: 'income', name: 'Salary' },
};

async function getOrCreateCategory(userId, info) {
  const { type, name } = info;
  const existing = await query(
    'SELECT id FROM categories WHERE (user_id = $1 OR user_id IS NULL) AND name = $2 AND type = $3 LIMIT 1',
    [userId, name, type]
  );
  if (existing.rowCount > 0) return existing.rows[0].id;
  const inserted = await query(
    'INSERT INTO categories (user_id, name, type) VALUES ($1, $2, $3) RETURNING id',
    [userId, name, type]
  );
  return inserted.rows[0].id;
}

function guessCategoryFromMerchant(merchantRaw) {
  if (!merchantRaw) return null;
  const merchant = merchantRaw.toLowerCase();
  for (const key of Object.keys(merchantCategoryMap)) {
    if (merchant.includes(key)) return merchantCategoryMap[key];
  }
  return null;
}

transactionsRouter.use(authRequired);

transactionsRouter.get('/', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const {
      page = '1',
      pageSize = '10',
      search = '',
      categoryId,
      type,
      minAmount,
      maxAmount,
      startDate,
      endDate,
    } = req.query;

    const limit = Math.min(parseInt(pageSize, 10) || 10, 100);
    const offset = (parseInt(page, 10) - 1 || 0) * limit;

    const conditions = ['user_id = $1'];
    const params = [userId];

    if (search) {
      params.push(`%${search}%`);
      conditions.push('(merchant ILIKE $' + params.length + ' OR description ILIKE $' + params.length + ')');
    }
    if (categoryId) {
      params.push(Number(categoryId));
      conditions.push('category_id = $' + params.length);
    }
    if (type) {
      params.push(type);
      conditions.push('type = $' + params.length);
    }
    if (minAmount) {
      params.push(Number(minAmount));
      conditions.push('amount >= $' + params.length);
    }
    if (maxAmount) {
      params.push(Number(maxAmount));
      conditions.push('amount <= $' + params.length);
    }
    if (startDate) {
      params.push(startDate);
      conditions.push('date >= $' + params.length);
    }
    if (endDate) {
      params.push(endDate);
      conditions.push('date <= $' + params.length);
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const dataQuery = `SELECT * FROM transactions ${where} ORDER BY date DESC, id DESC LIMIT $${
      params.length + 1
    } OFFSET $${params.length + 2}`;
    const countQuery = `SELECT COUNT(*) FROM transactions ${where}`;

    const dataParams = [...params, limit, offset];
    const [rowsRes, countRes] = await Promise.all([
      query(dataQuery, dataParams),
      query(countQuery, params),
    ]);

    const total = Number(countRes.rows[0].count || 0);
    res.json({
      items: rowsRes.rows,
      pagination: {
        page: Number(page),
        pageSize: limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
});

transactionsRouter.post('/', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const parsed = createSchema.parse(req.body);

    let categoryId = parsed.category_id ?? null;
    if (!categoryId) {
      const guessed = guessCategoryFromMerchant(parsed.merchant || parsed.description || '');
      if (guessed) {
        categoryId = await getOrCreateCategory(userId, guessed);
      }
    }

    const result = await query(
      'INSERT INTO transactions (user_id, amount, type, category_id, merchant, description, date, receipt_url) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [
        userId,
        parsed.amount,
        parsed.type,
        categoryId,
        parsed.merchant ?? null,
        parsed.description ?? null,
        parsed.date,
        parsed.receipt_url ?? null,
      ]
    );
    res.status(201).json({ transaction: result.rows[0] });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors.map((e) => e.message).join(', ') });
    }
    next(err);
  }
});

transactionsRouter.put('/:id', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });

    const parsed = updateSchema.parse(req.body);
    const fields = [];
    const params = [userId, id];

    function pushField(column, value) {
      params.push(value);
      fields.push(`${column} = $${params.length}`);
    }

    if (parsed.amount !== undefined) pushField('amount', parsed.amount);
    if (parsed.type !== undefined) pushField('type', parsed.type);
    if (parsed.category_id !== undefined) pushField('category_id', parsed.category_id);
    if (parsed.merchant !== undefined) pushField('merchant', parsed.merchant);
    if (parsed.description !== undefined) pushField('description', parsed.description);
    if (parsed.date !== undefined) pushField('date', parsed.date);
    if (parsed.receipt_url !== undefined) pushField('receipt_url', parsed.receipt_url);

    if (!fields.length) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const sql = `UPDATE transactions SET ${fields.join(', ')} WHERE user_id = $1 AND id = $2 RETURNING *`;
    const result = await query(sql, params);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ transaction: result.rows[0] });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors.map((e) => e.message).join(', ') });
    }
    next(err);
  }
});

transactionsRouter.delete('/:id', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const result = await query('DELETE FROM transactions WHERE user_id = $1 AND id = $2', [
      userId,
      id,
    ]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Not found' });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// Basic CSV import with duplicate detection
transactionsRouter.post('/import', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { csv } = req.body || {};
    if (!csv || typeof csv !== 'string') {
      return res.status(400).json({ error: 'csv string is required' });
    }

    const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      return res.status(400).json({ error: 'CSV must include a header and at least one row' });
    }
    const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const idxDate = header.indexOf('date');
    const idxAmount = header.indexOf('amount');
    const idxDesc = header.indexOf('description');
    const idxMerchant = header.indexOf('merchant');

    if (idxDate === -1 || idxAmount === -1) {
      return res.status(400).json({ error: 'CSV must include date and amount columns' });
    }

    const inserted = [];
    const skipped = [];

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',');
      const date = row[idxDate]?.trim();
      const amount = Number(row[idxAmount]);
      const description = idxDesc !== -1 ? row[idxDesc]?.trim() : null;
      const merchant = idxMerchant !== -1 ? row[idxMerchant]?.trim() : null;

      if (!date || !Number.isFinite(amount)) {
        skipped.push({ line: i + 1, reason: 'invalid date or amount' });
        continue;
      }

      const dupCheck = await query(
        "SELECT id FROM transactions WHERE user_id = $1 AND date = $2 AND amount = $3 AND COALESCE(merchant, '') = COALESCE($4, '')",
        [userId, date, amount, merchant]
      );
      if (dupCheck.rowCount > 0) {
        skipped.push({ line: i + 1, reason: 'duplicate' });
        continue;
      }

      const guessed = guessCategoryFromMerchant(merchant || description || '');
      let categoryId = null;
      if (guessed) {
        categoryId = await getOrCreateCategory(userId, guessed);
      }

      const result = await query(
        'INSERT INTO transactions (user_id, amount, type, category_id, merchant, description, date) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id',
        [
          userId,
          amount,
          amount >= 0 ? 'expense' : 'income',
          categoryId,
          merchant,
          description,
          date,
        ]
      );
      inserted.push(result.rows[0].id);
    }

    res.json({ insertedCount: inserted.length, skipped });
  } catch (err) {
    next(err);
  }
});
