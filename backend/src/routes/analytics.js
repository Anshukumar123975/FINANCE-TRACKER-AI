import express from 'express';
import { authRequired } from '../middleware/auth.js';
import { query } from '../db.js';

export const analyticsRouter = express.Router();

analyticsRouter.use(authRequired);

// Spending trends and category distribution
analyticsRouter.get('/summary', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { month } = req.query; // optional YYYY-MM

    const monthFilter = month && typeof month === 'string' ? month : null;

    const incomeRes = await query(
      "SELECT SUM(amount) AS total_income FROM transactions WHERE user_id = $1 AND type = 'income'" +
        (monthFilter ? " AND to_char(date, 'YYYY-MM') = $2" : ''),
      monthFilter ? [userId, monthFilter] : [userId]
    );

    const expenseRes = await query(
      "SELECT SUM(amount) AS total_expense FROM transactions WHERE user_id = $1 AND type = 'expense'" +
        (monthFilter ? " AND to_char(date, 'YYYY-MM') = $2" : ''),
      monthFilter ? [userId, monthFilter] : [userId]
    );

    const categorySqlBase = "SELECT COALESCE(c.name, 'Uncategorized') AS category, SUM(t.amount) AS total " +
      "FROM transactions t LEFT JOIN categories c ON t.category_id = c.id " +
      "WHERE t.user_id = $1 AND t.type = 'expense'";
    const categorySql =
      categorySqlBase + (monthFilter ? " AND to_char(t.date, 'YYYY-MM') = $2" : '') +
      " GROUP BY COALESCE(c.name, 'Uncategorized') ORDER BY total DESC";
    const categoryRes = await query(categorySql, monthFilter ? [userId, monthFilter] : [userId]);

    // Simple time series by day for the month
    const trendsRes = await query(
      "SELECT date, SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS income, " +
        "SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expense " +
        'FROM transactions WHERE user_id = $1' +
        (monthFilter ? " AND to_char(date, 'YYYY-MM') = $2" : '') +
        ' GROUP BY date ORDER BY date',
      monthFilter ? [userId, monthFilter] : [userId]
    );

    res.json({
      total_income: Number(incomeRes.rows[0].total_income || 0),
      total_expense: Number(expenseRes.rows[0].total_expense || 0),
      categories: categoryRes.rows.map((r) => ({ category: r.category, total: Number(r.total) })),
      trends: trendsRes.rows.map((r) => ({
        date: r.date,
        income: Number(r.income || 0),
        expense: Number(r.expense || 0),
      })),
    });
  } catch (err) {
    next(err);
  }
});

// Very simple anomaly detection: transactions > 2x average expense in their category
analyticsRouter.get('/anomalies', async (req, res, next) => {
  try {
    const userId = req.user.id;

    const avgRes = await query(
      "SELECT COALESCE(category_id, 0) AS category_id, AVG(amount) AS avg_amount FROM transactions WHERE user_id = $1 AND type = 'expense' GROUP BY COALESCE(category_id, 0)",
      [userId]
    );
    const avgMap = new Map();
    for (const row of avgRes.rows) {
      avgMap.set(row.category_id, Number(row.avg_amount));
    }

    const anomaliesRes = await query(
      'SELECT t.*, c.name AS category_name FROM transactions t ' +
        'LEFT JOIN categories c ON t.category_id = c.id ' +
        "WHERE t.user_id = $1 AND t.type = 'expense'",
      [userId]
    );

    const anomalies = [];
    for (const t of anomaliesRes.rows) {
      const key = t.category_id ?? 0;
      const avg = avgMap.get(key) || 0;
      if (avg === 0) continue;
      if (Number(t.amount) >= 2 * avg) {
        anomalies.push({
          transaction: t,
          category_average: avg,
        });
      }
    }

    res.json({ items: anomalies });
  } catch (err) {
    next(err);
  }
});
