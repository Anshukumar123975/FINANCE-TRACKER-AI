import express from 'express';
import PDFDocument from 'pdfkit';
import { authRequired } from '../middleware/auth.js';
import { query } from '../db.js';

export const reportsRouter = express.Router();

reportsRouter.use(authRequired);

reportsRouter.get('/summary.pdf', async (req, res, next) => {
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

    const transactionsRes = await query(
      'SELECT date, description, merchant, type, amount FROM transactions WHERE user_id = $1' +
        (monthFilter ? " AND to_char(date, 'YYYY-MM') = $2" : '') +
        ' ORDER BY date DESC',
      monthFilter ? [userId, monthFilter] : [userId]
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="finance-summary.pdf"');

    const doc = new PDFDocument();
    doc.pipe(res);

    doc.fontSize(20).text('Personal Finance Summary', { align: 'center' });
    if (monthFilter) {
      doc.moveDown().fontSize(12).text(`Period: ${monthFilter}`);
    }
    doc.moveDown();

    const totalIncome = Number(incomeRes.rows[0].total_income || 0);
    const totalExpense = Number(expenseRes.rows[0].total_expense || 0);
    const net = totalIncome - totalExpense;

    doc.fontSize(14).text(`Total Income: ${totalIncome.toFixed(2)}`);
    doc.text(`Total Expense: ${totalExpense.toFixed(2)}`);
    doc.text(`Net: ${net.toFixed(2)}`);
    doc.moveDown();

    doc.fontSize(14).text('Recent Transactions');
    doc.moveDown(0.5);
    doc.fontSize(10);

    transactionsRes.rows.slice(0, 50).forEach((t) => {
      doc.text(
        `${t.date} | ${t.type.toUpperCase()} | ${t.merchant || t.description || ''} | ${Number(
          t.amount
        ).toFixed(2)}`
      );
    });

    doc.end();
  } catch (err) {
    next(err);
  }
});
