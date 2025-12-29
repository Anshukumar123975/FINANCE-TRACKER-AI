import express from 'express';
import { authRequired } from '../middleware/auth.js';
import { query } from '../db.js';

export const categoriesRouter = express.Router();

categoriesRouter.use(authRequired);

categoriesRouter.get('/', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await query(
      'SELECT * FROM categories WHERE user_id = $1 OR user_id IS NULL ORDER BY type, name',
      [userId]
    );
    res.json({ items: result.rows });
  } catch (err) {
    next(err);
  }
});
