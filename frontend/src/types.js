// Shared frontend types using JSDoc + TypeScript syntax for better tooling

/** @typedef {'income' | 'expense'} TransactionType */

/**
 * @typedef {Object} Transaction
 * @property {number} id
 * @property {number} user_id
 * @property {number} amount
 * @property {TransactionType} type
 * @property {number | null} category_id
 * @property {string | null} merchant
 * @property {string | null} description
 * @property {string} date
 * @property {string | null} receipt_url
 * @property {string} created_at
 */

/**
 * @typedef {Object} Budget
 * @property {number} id
 * @property {number} user_id
 * @property {number | null} category_id
 * @property {number} monthly_limit
 * @property {string} month
 * @property {number} [spent]
 * @property {number} [utilization]
 * @property {'green' | 'yellow' | 'red'} [status]
 */

/**
 * @typedef {Object} Goal
 * @property {number} id
 * @property {number} user_id
 * @property {string} name
 * @property {number} target_amount
 * @property {number} current_amount
 * @property {string} target_date
 */

/**
 * @typedef {Object} Bill
 * @property {number} id
 * @property {number} user_id
 * @property {string} name
 * @property {number} amount
 * @property {string} due_date
 * @property {boolean} is_recurring
 * @property {string | null} recurrence_rule
 * @property {boolean} paid
 */
