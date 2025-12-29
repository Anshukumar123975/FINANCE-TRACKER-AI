# Finance Tracker AI

A modern, AI-powered personal finance management application with intelligent transaction categorization, budget tracking, and natural language processing capabilities.

## Features

### AI-Powered Financial Assistant
- **Natural Language Processing**: Add transactions, create goals, and manage budgets through conversational AI
- **Intelligent Auto-Categorization**: Automatically categorizes transactions based on merchant names and product descriptions
- **Smart Merchant Inference**: Understands "pizza" -> "Pizza Restaurant" with appropriate category mapping
- **Currency Conversion**: Built-in support for 5+ currencies with automatic conversion to INR.
- **Contextual Awareness**: Date-aware AI that understands "today", "this month", "last week"
- **Multi-Currency Support**: Default INR with intelligent currency recognition (USD, EUR, GBP, etc.)

### Core Financial Features
- **Transaction Management**
  - Manual entry with category selection
  - CSV bulk import with duplicate detection
  - Receipt OCR using Tesseract.js
  - Advanced filtering (date range, category, type, amount)
  - Pagination support

- **Budget Tracking**
  - Category-based monthly budgets
  - Real-time utilization tracking
  - Color-coded status indicators (green/yellow/red)
  - Budget vs. actual spending visualization

- **Savings Goals**
  - Target amount and date tracking
  - Progress visualization
  - AI-assisted goal creation from natural language
  - Current amount vs. target tracking

- **Bill Reminders**
  - One-time and recurring bills
  - Due date tracking
  - Payment status management
  - Calendar view integration

### Analytics & Reporting
- **Dashboard Overview**
  - Income/expense/savings summary cards
  - Spending trends (line chart)
  - Category distribution (pie chart)
  - Budget progress bars

- **AI-Powered Insights**
  - Anomaly detection (unusual spending patterns)
  - Spending analysis by category
  - Savings suggestions based on habits
  - Custom financial advice

- **PDF Reports**
  - Monthly/quarterly/yearly reports
  - Category breakdowns
  - Visual charts and graphs
  - Exportable summaries

---

## Tech Stack

### Backend
- **Node.js 18+** with Express.js
- **PostgreSQL 16** (via Docker Compose)
- **Zod** for schema validation
- **JWT** for authentication
- **bcryptjs** for password hashing
- **PDFKit** for report generation
- **OpenRouter API** for LLM integration
- **Nodemon** for ing in development
- **Built-in Currency Converter** (5+ currencies)

### Frontend
- **React 18** with Vite
- **React Router** for navigation
- **Tailwind CSS** for styling
- **Recharts** for data visualization
- **Tesseract.js** for OCR
- **Lucide React** for icons

### Database
- **PostgreSQL**
- Schema migrations with custom runner
- Indexed queries for performance
- Foreign key constraints for data integrity

---

## Getting Started

### Prerequisites
- Node.js 18 or higher
- Docker and Docker Compose
- OpenRouter API key

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd "Finance Tracker"
```

2. **Set up PostgreSQL with Docker**
```bash
docker-compose up -d
```
This starts PostgreSQL on `localhost:5434`

3. **Configure Backend Environment**
```bash
cd backend
```

Edit `.env`:
```env
DATABASE_URL=postgresql://financeuser:financepass@localhost:5434/financetracker
JWT_SECRET=your-secret-key-here
OPENROUTER_API_KEY=your-openrouter-api-key
CLIENT_URL=http://localhost:5173
PORT=4000
```

4. **Install Backend Dependencies**
```bash
npm install
```

5. **Run Database Migrations**
```bash
npm run migrate
```

6. **Start Backend Server**
```bash
npm run dev
```
Backend runs on `http://localhost:4000`

7. **Configure Frontend (new terminal)**
```bash
cd ../frontend
```

Create `.env` (optional, default is correct):
```env
VITE_API_BASE_URL=http://localhost:4000/api
```

8. **Install Frontend Dependencies**
```bash
npm install
```

9. **Start Frontend Development Server**
```bash
npm run dev
```
Frontend runs on `http://localhost:5173`

---

## Usage Examples

### AI Assistant Commands

**Add Transactions:**
```
"I spent 500 on pizza today"
-> Creates expense: ₹500, merchant: "Pizza Restaurant", category: "Food & Dining"

"Bought coffee for 150"
-> Creates expense: ₹150, merchant: "Coffee Shop", category: "Food & Dining"

"Add income 50000 from salary"
-> Creates income: ₹50,000, merchant: "Salary", category: "Salary"

"Spent 20 dollars on lunch"
-> Converts: $20 = ₹1,670 (at 83.50 rate)
-> Creates expense: ₹1,670, category: "Food & Dining"

"Bought something for 50 euros"
-> Converts: €50 = ₹4,550 (at 91.00 rate)
-> Creates expense: ₹4,550
```

**Create Savings Goals:**
```
"I want to save 100000 for a vacation by June 2026"
-> Creates goal: "Vacation", ₹100,000, target: 2026-06-30

"Save 50000 in 6 months for a new laptop"
-> Calculates target date and creates goal
```

**Set Budgets:**
```
"Set a budget of 10000 for food this month"
-> Creates/updates Food & Dining budget: ₹10,000

"Create budget: transport 5000"
-> Creates Transport budget: ₹5,000
```

**Get Insights:**
```
"How much did I spend on food this month?"
"Show my budget status"
"Detect any unusual spending"
"Suggest ways to save money"
```

---

## Architecture

### Backend Architecture
```
backend/
├── src/
│   ├── routes/          # API endpoints
│   │   ├── auth.js      # Authentication (register, login)
│   │   ├── transactions.js  # Transaction CRUD + CSV import
│   │   ├── categories.js    # Category listing
│   │   ├── budgets.js   # Budget management
│   │   ├── bills.js     # Bill reminders
│   │   ├── goals.js     # Savings goals
│   │   ├── analytics.js # Dashboard data
│   │   ├── reports.js   # PDF generation
│   │   └── chat.js      # AI assistant
│   ├── services/
│   │   └── agent.js     # LLM tool calling logic
│   ├── middleware/
│   │   ├── auth.js      # JWT verification
│   │   └── errorHandler.js
│   ├── db.js            # PostgreSQL connection
│   ├── config.js        # Environment variables
│   └── index.js         # Express app entry
├── migrations/
│   └── 001_init.sql     # Database schema
└── scripts/
    └── runMigrations.js # Migration runner
```

### Frontend Architecture
```
frontend/
├── src/
│   ├── pages/           # Route components
│   │   ├── AuthPage.jsx       # Login/Register
│   │   ├── DashboardPage.jsx  # Overview
│   │   ├── TransactionsPage.jsx
│   │   ├── BudgetsPage.jsx
│   │   ├── BillsPage.jsx
│   │   ├── GoalsPage.jsx
│   │   └── ChatPage.jsx       # AI Assistant
│   ├── App.jsx          # Main app + routing
│   ├── api.js           # Fetch wrapper
│   └── index.css        # Tailwind + custom styles
└── vite.config.js
```

### Database Schema
```sql
users (id, email, password_hash, created_at)
categories (id, user_id, name, type)
transactions (id, user_id, amount, type, category_id, merchant, description, date)
budgets (id, user_id, category_id, monthly_limit, month)
bills (id, user_id, name, amount, due_date, is_recurring, paid)
goals (id, user_id, name, target_amount, current_amount, target_date)
receipts (id, user_id, transaction_id, image_url, ocr_text)
chat_messages (id, user_id, role, content, tool_name)
```

---

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create new user
- `POST /api/auth/login` - Login and get JWT token

### Transactions
- `GET /api/transactions` - List with filters & pagination
- `POST /api/transactions` - Create transaction
- `PUT /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Delete transaction
- `POST /api/transactions/import` - CSV bulk import

### Categories
- `GET /api/categories` - List user categories

### Budgets
- `GET /api/budgets` - List budgets
- `POST /api/budgets` - Create/update budget
- `DELETE /api/budgets/:id` - Delete budget

### Bills
- `GET /api/bills` - List bills
- `POST /api/bills` - Create bill
- `PUT /api/bills/:id` - Update bill
- `DELETE /api/bills/:id` - Delete bill

### Goals
- `GET /api/goals` - List goals
- `POST /api/goals` - Create goal
- `PUT /api/goals/:id` - Update goal (add to current_amount)
- `DELETE /api/goals/:id` - Delete goal

### Analytics
- `GET /api/analytics/summary` - Dashboard summary
- `GET /api/analytics/trends` - Monthly trends
- `GET /api/analytics/categories` - Category spending

### Reports
- `GET /api/reports/generate` - Generate PDF report

### Chat
- `POST /api/chat` - Send message to AI assistant

---

## AI Agent Tools

The AI assistant has access to the following tools:

1. **convert_currency_to_inr** - Convert 5+ currencies to INR using average rates (offline)
2. **add_transaction** - Create income/expense with smart categorization
3. **get_spending_by_category** - Analyze spending by category
4. **create_budget** - Set/update category budgets
5. **get_budget_status** - Check budget utilization
6. **detect_anomalies** - Find unusual spending patterns
7. **suggest_savings** - Generate savings recommendations
8. **create_goal** - Create savings goals from natural language

---

## Security Features

- **Password Hashing**: bcryptjs with salt rounds
- **JWT Authentication**: Secure token-based auth
- **Input Validation**: Zod schema validation
- **SQL Injection Protection**: Parameterized queries
- **CORS Configuration**: Restricted origins
- **Environment Variables**: Sensitive data in .env

---

## Environment Variables

### Backend (.env)
```env
DATABASE_URL=postgresql://user:pass@host:port/dbname
JWT_SECRET=your-jwt-secret-key
OPENROUTER_API_KEY=sk-or-v1-xxxxx
CLIENT_URL=http://localhost:5173
PORT=4000
```

### Frontend (.env)
```env
VITE_API_BASE_URL=http://localhost:4000/api
```

---

## Docker Configuration

The `docker-compose.yml` provides PostgreSQL 16:
- **Container**: postgres:16-alpine
- **Port**: 5434 (to avoid conflicts with local PostgreSQL)
- **Database**: financetracker
- **User/Password**: financeuser/financepass
- **Persistent Volume**: postgres_data

---

## Development

### Backend 
```bash
cd backend
npm run dev  # Uses nodemon
```

### Frontend 
```bash
cd frontend
npm run dev  # Uses Vite HMR
```

### Database Migrations
```bash
cd backend
npm run migrate
```

---

## Build for Production

### Backend
```bash
cd backend
npm start  # Uses node directly
```

### Frontend
```bash
cd frontend
npm run build
npm run preview
```

---

## Contributing

Contributions are welcome! Please follow these guidelines:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---
## Acknowledgments

- **OpenRouter** for LLM API access
- **Tesseract.js** for OCR capabilities
- **Recharts** for beautiful data visualizations
- **Tailwind CSS** for utility-first styling
- **Lucide** for icon library

---

## Support

For issues, questions, or suggestions:
- Open an issue on GitHub

---
