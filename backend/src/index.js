import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { config } from './config.js';
import { authRouter } from './routes/auth.js';
import { transactionsRouter } from './routes/transactions.js';
import { categoriesRouter } from './routes/categories.js';
import { budgetsRouter } from './routes/budgets.js';
import { billsRouter } from './routes/bills.js';
import { goalsRouter } from './routes/goals.js';
import { analyticsRouter } from './routes/analytics.js';
import { reportsRouter } from './routes/reports.js';
import { chatRouter } from './routes/chat.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

app.use(cors({ origin: config.clientUrl, credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/budgets', budgetsRouter);
app.use('/api/bills', billsRouter);
app.use('/api/goals', goalsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/chat', chatRouter);

app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`Backend listening on port ${config.port}`);
});
