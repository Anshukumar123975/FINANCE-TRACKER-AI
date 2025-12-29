import { config } from '../config.js';
import { query } from '../db.js';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

const tools = [
  {
    type: 'function',
    function: {
      name: 'convert_currency_to_inr',
      description: 'Convert any foreign currency amount to Indian Rupees (INR). Use this when user specifies an amount in a foreign currency like USD, EUR, GBP, etc.',
      parameters: {
        type: 'object',
        properties: {
          amount: { 
            type: 'number',
            description: 'The amount in the source currency'
          },
          from_currency: { 
            type: 'string',
            description: 'Source currency code (e.g., USD, EUR, GBP, AED, SGD, AUD, CAD, JPY, CNY)'
          }
        },
        required: ['amount', 'from_currency'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_transaction',
      description: 'Add a new income or expense transaction for the current user. When user mentions a product, service, or activity (e.g., "pizza", "coffee", "movie", "haircut"), intelligently determine the merchant name and category.',
      parameters: {
        type: 'object',
        properties: {
          amount: { type: 'number' },
          type: { type: 'string', enum: ['income', 'expense'] },
          merchant: { 
            type: 'string',
            description: 'Merchant or service provider name. If user mentions a product/service without merchant (e.g., "pizza", "coffee"), infer a representative merchant name that clearly symbolizes the product (e.g., "Pizza Place", "Coffee Shop").'
          },
          description: { 
            type: 'string',
            description: 'Detailed description of the transaction including the product/service mentioned by the user.'
          },
          category_name: {
            type: 'string',
            description: 'Category name that best matches the transaction. Choose from common categories: Food & Dining, Groceries, Transport, Shopping, Entertainment, Healthcare, Utilities, Education, Travel, Personal Care, Subscriptions, Salary, Freelance, Investment, or create a new appropriate category.'
          },
          date: { type: 'string', description: 'ISO date string (YYYY-MM-DD)' },
        },
        required: ['amount', 'type'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_spending_by_category',
      description: 'Get total spending by category for a given month',
      parameters: {
        type: 'object',
        properties: {
          month: { type: 'string', description: 'YYYY-MM, defaults to current month', nullable: true },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_budget',
      description: 'Create or update a monthly budget for a category',
      parameters: {
        type: 'object',
        properties: {
          category_name: { type: 'string' },
          monthly_limit: { type: 'number' },
          month: { type: 'string', description: 'YYYY-MM, defaults to current month', nullable: true },
        },
        required: ['category_name', 'monthly_limit'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_goal',
      description: 'Create a savings goal for the user. Use when user wants to save a specific amount by a target date.',
      parameters: {
        type: 'object',
        properties: {
          name: { 
            type: 'string',
            description: 'Name/description of the savings goal (e.g., "Vacation", "New Laptop", "Emergency Fund")'
          },
          target_amount: { 
            type: 'number',
            description: 'Target amount to save in Rupees'
          },
          target_date: { 
            type: 'string',
            description: 'Target date to achieve the goal (YYYY-MM-DD format)'
          },
          current_amount: {
            type: 'number',
            description: 'Current saved amount (optional, defaults to 0)',
            nullable: true
          }
        },
        required: ['name', 'target_amount', 'target_date'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_budget_status',
      description: 'Get current utilization and color status for all budgets',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'detect_anomalies',
      description: 'Detect unusual spending patterns for the user',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'suggest_savings',
      description: 'Suggest ways the user can save money based on recent spending and goals',
      parameters: {
        type: 'object',
        properties: {
          target_amount: {
            type: 'number',
            description: 'Target amount the user wants to save (optional, used for goals)',
            nullable: true,
          },
          target_date: {
            type: 'string',
            description: 'Target date to reach savings goal (YYYY-MM-DD, optional)',
            nullable: true,
          },
        },
      },
    },
  },
];

async function callTool(userId, toolCall) {
  const name = toolCall.function.name;
  const args = JSON.parse(toolCall.function.arguments || '{}');

  if (name === 'convert_currency_to_inr') {
    const { amount, from_currency } = args;
    
    // Average conversion rates to INR (updated periodically)
    const exchangeRates = {
      'USD': 83.50,   // US Dollar
      'EUR': 91.00,   // Euro
      'GBP': 106.00,  // British Pound
      'JPY': 0.57,    // Japanese Yen
      'RUB': 0.92,    // Russian Ruble
      'INR': 1.00     // Indian Rupee (base)
    };
    
    const currencyUpper = from_currency.toUpperCase();
    const rate = exchangeRates[currencyUpper];
    
    if (!rate) {
      return { 
        error: `Currency ${currencyUpper} not supported. Supported currencies: ${Object.keys(exchangeRates).join(', ')}` 
      };
    }
    
    const inrAmount = Math.round(amount * rate * 100) / 100;
    return {
      original_amount: amount,
      original_currency: currencyUpper,
      inr_amount: inrAmount,
      exchange_rate: rate,
      message: `${amount} ${currencyUpper} = ₹${inrAmount.toFixed(2)} (Rate: 1 ${currencyUpper} = ₹${rate.toFixed(2)})`
    };
  }

  if (name === 'add_transaction') {
    const { amount, type, merchant = null, description = null, category_name = null } = args;
    const date = args.date || new Date().toISOString().slice(0, 10);
    
    // Handle category if provided
    let categoryId = null;
    if (category_name) {
      const catRes = await query(
        "SELECT id FROM categories WHERE (user_id = $1 OR user_id IS NULL) AND name ILIKE $2 AND type = $3 LIMIT 1",
        [userId, category_name, type]
      );
      if (catRes.rowCount > 0) {
        categoryId = catRes.rows[0].id;
      } else {
        // Create new category
        const inserted = await query(
          "INSERT INTO categories (user_id, name, type) VALUES ($1, $2, $3) RETURNING id",
          [userId, category_name, type]
        );
        categoryId = inserted.rows[0].id;
      }
    }
    
    const result = await query(
      'INSERT INTO transactions (user_id, amount, type, category_id, merchant, description, date) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [userId, amount, type, categoryId, merchant, description, date]
    );
    return { transaction: result.rows[0] };
  }

  if (name === 'get_spending_by_category') {
    const now = new Date();
    const month = args.month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const res = await query(
      "SELECT COALESCE(c.name, 'Uncategorized') AS category, SUM(t.amount) AS total FROM transactions t LEFT JOIN categories c ON t.category_id = c.id WHERE t.user_id = $1 AND t.type = 'expense' AND to_char(t.date, 'YYYY-MM') = $2 GROUP BY COALESCE(c.name, 'Uncategorized') ORDER BY total DESC",
      [userId, month]
    );
    return { month, categories: res.rows };
  }

  if (name === 'create_budget') {
    const now = new Date();
    const month = args.month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const categoryName = args.category_name;
    const limit = args.monthly_limit;

    const catRes = await query(
      "SELECT id FROM categories WHERE (user_id = $1 OR user_id IS NULL) AND name = $2 LIMIT 1",
      [userId, categoryName]
    );
    let categoryId;
    if (catRes.rowCount > 0) {
      categoryId = catRes.rows[0].id;
    } else {
      const inserted = await query(
        "INSERT INTO categories (user_id, name, type) VALUES ($1,$2,'expense') RETURNING id",
        [userId, categoryName]
      );
      categoryId = inserted.rows[0].id;
    }

    const upsert = await query(
      'INSERT INTO budgets (user_id, category_id, monthly_limit, month) VALUES ($1,$2,$3,$4) ON CONFLICT (user_id, category_id, month) DO UPDATE SET monthly_limit = EXCLUDED.monthly_limit RETURNING *',
      [userId, categoryId, limit, month]
    );
    return { budget: upsert.rows[0] };
  }

  if (name === 'get_budget_status') {
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
      return { ...b, spent, utilization, status };
    });
    return { month, items };
  }

  if (name === 'detect_anomalies') {
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
        anomalies.push({ transaction: t, category_average: avg });
      }
    }
    return { items: anomalies };
  }

  if (name === 'suggest_savings') {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const expenseRes = await query(
      "SELECT COALESCE(c.name, 'Uncategorized') AS category, SUM(t.amount) AS total FROM transactions t LEFT JOIN categories c ON t.category_id = c.id WHERE t.user_id = $1 AND t.type = 'expense' AND to_char(t.date, 'YYYY-MM') = $2 GROUP BY COALESCE(c.name, 'Uncategorized') ORDER BY total DESC",
      [userId, month]
    );
    const topCategories = expenseRes.rows;
    return {
      month,
      target_amount: args.target_amount ?? null,
      target_date: args.target_date ?? null,
      top_categories: topCategories,
    };
  }

  if (name === 'create_goal') {
    const { name: goalName, target_amount, target_date, current_amount = 0 } = args;
    const result = await query(
      'INSERT INTO goals (user_id, name, target_amount, current_amount, target_date) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [userId, goalName, target_amount, current_amount, target_date]
    );
    return { goal: result.rows[0] };
  }

  return { error: `Unknown tool ${name}` };
}

async function fetchChatCompletion(messages, toolCalls) {
  const body = {
    model: config.openRouterModel,
    messages,
    tools,
    tool_choice: 'auto',
  };

  const resp = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.openRouterApiKey}`,
      'HTTP-Referer': 'https://your-app-url.example',
      'X-Title': 'Finance Tracker Agent',
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`OpenRouter error: ${resp.status} ${text}`);
  }

  const json = await resp.json();
  return json;
}

export async function runAgent({ userId, message }) {
  const historyRes = await query(
    'SELECT role, content, tool_name FROM chat_messages WHERE user_id = $1 ORDER BY created_at ASC LIMIT 30',
    [userId]
  );

  const messages = historyRes.rows
    .map((m) => {
      if (m.role === 'tool') {
        // Historical tool messages are not re-sent to the model to avoid invalid tool-call chains
        return null;
      }
      return { role: m.role, content: m.content };
    })
    .filter(Boolean);

  // Add system message with current date context
  const now = new Date();
  const currentDate = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
  const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });
  const fullDate = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  
  const systemMessage = {
    role: 'system',
    content: `You are a helpful financial assistant. Today's date is ${fullDate} (${dayOfWeek}). The current date in YYYY-MM-DD format is ${currentDate}. The current month is ${currentMonth}. When users refer to "today", "this month", "this week", or relative time periods, use this date as the reference point. Always consider this context when analyzing transactions, budgets, and financial goals.

**IMPORTANT**: All monetary amounts are in Indian Rupees (₹ INR) by default. When users mention amounts without currency, assume it's in Rupees. When displaying amounts, you can use the ₹ symbol.

**CURRENCY CONVERSION**: When users mention amounts in foreign currencies (USD, EUR, GBP, AED, etc.), you MUST:
1. FIRST use the convert_currency_to_inr tool to get the INR equivalent
2. THEN use the converted INR amount when creating transactions
3. Mention both the original amount and converted amount in your response

Examples:
- "I spent 20 dollars on coffee" → convert_currency_to_inr(20, USD) → then add_transaction with INR amount
- "Bought something for 50 euros" → convert_currency_to_inr(50, EUR) → then add_transaction with INR amount
- "100 AED spent" → convert first, then create transaction

When users mention expenses without explicit merchant names, intelligently infer:
1. **Merchant Name**: Create a clear, descriptive merchant name that symbolizes the product/service (e.g., "Pizza" → "Pizza Restaurant", "coffee" → "Coffee Shop", "movie" → "Cinema", "uber" → "Uber", "groceries" → "Grocery Store")
2. **Category**: Assign the most appropriate category based on the product/service:
   - Food items (pizza, burger, coffee) → "Food & Dining"
   - Groceries, vegetables → "Groceries"
   - Taxi, uber, bus → "Transport"
   - Clothes, gadgets → "Shopping"
   - Movies, games → "Entertainment"
   - Doctor, medicine → "Healthcare"
   - Electricity, water, internet → "Utilities"
   - Courses, books → "Education"
   - Flights, hotels → "Travel"
   - Haircut, salon → "Personal Care"
   - Netflix, Spotify → "Subscriptions"
3. **Description**: Include what the user mentioned (product/service) for clarity

When users want to create savings goals, use the create_goal tool. Examples:
- "I want to save 50000 for a vacation by June 2026" → create_goal with name="Vacation", target_amount=50000, target_date="2026-06-30"
- "Save 100000 in 6 months" → calculate target_date as 6 months from today, create_goal
- "Goal: new laptop, 80000, by next year" → create_goal with appropriate parameters

Always be intelligent about context - if user says "I spent 500 on pizza", understand it's ₹500 for a food expense even without saying "Domino's".`
  };
  
  messages.unshift(systemMessage);

  messages.push({ role: 'user', content: message });

  const insertUser = await query(
    'INSERT INTO chat_messages (user_id, role, content) VALUES ($1,$2,$3) RETURNING id',
    [userId, 'user', message]
  );

  let finalAssistantMessage = null;
  let toolLoopCount = 0;

  while (toolLoopCount < 4) {
    toolLoopCount += 1;
    const completion = await fetchChatCompletion(messages);
    const choice = completion.choices?.[0];
    if (!choice) break;
    const msg = choice.message;

    if (msg.tool_calls && msg.tool_calls.length > 0) {
      messages.push({ role: 'assistant', content: msg.content || '', tool_calls: msg.tool_calls });
      await query(
        'INSERT INTO chat_messages (user_id, role, content) VALUES ($1,$2,$3)',
        [userId, 'assistant', msg.content || '']
      );

      for (const toolCall of msg.tool_calls) {
        const toolResult = await callTool(userId, toolCall);
        const toolContent = JSON.stringify(toolResult);
        messages.push({
          role: 'tool',
          name: toolCall.function.name,
          content: toolContent,
          tool_call_id: toolCall.id,
        });
        await query(
          'INSERT INTO chat_messages (user_id, role, content, tool_name) VALUES ($1,$2,$3,$4)',
          [userId, 'tool', toolContent, toolCall.function.name]
        );
      }
      continue;
    }

    finalAssistantMessage = msg.content || '';
    messages.push({ role: 'assistant', content: finalAssistantMessage });
    await query('INSERT INTO chat_messages (user_id, role, content) VALUES ($1,$2,$3)', [
      userId,
      'assistant',
      finalAssistantMessage,
    ]);
    break;
  }

  if (!finalAssistantMessage) {
    finalAssistantMessage =
      "I'm having trouble formulating a response right now, but your data and tools are available.";
  }

  return { message: finalAssistantMessage };
}
