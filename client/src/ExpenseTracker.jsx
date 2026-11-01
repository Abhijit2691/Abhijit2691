
import { useEffect, useState } from 'react';
import API_BASE_URL from "./config/api.js";
const API_URL = `${API_BASE_URL}/api/expenses`;

const CATEGORIES = [
  'Food',
  'Transport',
  'Home',
  'Health',
  'Shopping',
  'Learning',
  'Other',
];

function getToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  // Build the date using string concatenation instead of backticks.
  return year + '-' + month + '-' + day;
}

function formatRupees(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);
}

function ExpenseTracker() {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food');
  const [expenseDate, setExpenseDate] = useState(getToday());

  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [message, setMessage] = useState('');

  // Fetch saved expenses from the backend.
  useEffect(() => {
    let cancelled = false;

    async function loadExpenses() {
      try {
        const response = await fetch(API_URL);
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error('Could not load expenses.');
        }

        if (!cancelled) {
          setExpenses(result.data);
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(
            'Could not load expenses. Check that the backend is running.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadExpenses();

    return () => {
      cancelled = true;
    };
  }, []);

  // Calculate spending across all saved expenses.
  const totalExpenses = expenses.reduce(function (total, expense) {
    return total + Number(expense.amount);
  }, 0);

  // Add a new expense through the API.
  async function handleSubmit(event) {
    event.preventDefault();

    const numericAmount = Number(amount);

    if (
      !description.trim() ||
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0 ||
      numericAmount > 1000000000 ||
      !expenseDate ||
      expenseDate > getToday()
    ) {
      setMessage('Enter a valid description, amount, and date.');
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: description.trim(),
          amount: numericAmount,
          category: category,
          expense_date: expenseDate,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Could not save expense.');
      }

      setExpenses(function (previous) {
        const updated = [result.data].concat(previous);

        return updated.sort(function (a, b) {
          const dateOrder = b.expense_date.localeCompare(a.expense_date);
// Notify other dashboard components that expenses changed.
          return dateOrder || b.id - a.id;
          
        });
        
      });
window.dispatchEvent(new Event('kaizen-expenses-updated'));

      setDescription('');
      setAmount('');
      setCategory('Food');
      setExpenseDate(getToday());

      setMessage('Expense saved to the database.');
    } catch (error) {
      setMessage(error.message || 'Could not save expense.');
    } finally {
      setSaving(false);
    }
  }

  // Delete an expense using its database ID.
  async function handleDelete(id) {
    setDeletingId(id);
    setMessage('');

    try {
      const response = await fetch(
        API_URL + '/' + encodeURIComponent(id),
        { method: 'DELETE' }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Could not delete expense.');
      }

      setExpenses(function (previous) {
        return previous.filter(function (expense) {
          // Notify the Budget Tracker to recalculate its totals.
window.dispatchEvent(new Event('kaizen-expenses-updated'));
          return expense.id !== id;
        });
      });

      setMessage('Expense deleted successfully.');
    } catch (error) {
      setMessage(error.message || 'Could not delete expense.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="tracker-card">
      <p className="principle-label">
        JAPANESE PRINCIPLE · KAKEIBO
      </p>

      <h2>💰 Expense Tracker</h2>

      <p>
        Record your spending and become more aware of where your money goes.
      </p>

      <div className="expense-summary">
        <span>Total recorded expenses</span>
        <strong>{formatRupees(totalExpenses)}</strong>
      </div>

      <form className="tracker-form" onSubmit={handleSubmit}>
        <label htmlFor="expenseDescription">Description</label>
        <input
          id="expenseDescription"
          type="text"
          value={description}
          onChange={function (event) {
            setDescription(event.target.value);
          }}
          placeholder="e.g. Lunch, bus ticket"
          maxLength={200}
          required
        />

        <label htmlFor="expenseAmount">Amount (₹)</label>
        <input
          id="expenseAmount"
          type="number"
          value={amount}
          onChange={function (event) {
            setAmount(event.target.value);
          }}
          min="0.01"
          max="1000000000"
          step="0.01"
          placeholder="e.g. 150"
          required
        />

        <label htmlFor="expenseCategory">Category</label>
        <select
          id="expenseCategory"
          value={category}
          onChange={function (event) {
            setCategory(event.target.value);
          }}
        >
          {CATEGORIES.map(function (item) {
            return (
              <option key={item} value={item}>
                {item}
              </option>
            );
          })}
        </select>

        <label htmlFor="expenseDate">Expense date</label>
        <input
          id="expenseDate"
          type="date"
          value={expenseDate}
          max={getToday()}
          onChange={function (event) {
            setExpenseDate(event.target.value);
          }}
          required
        />

        <button type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Add Expense'}
        </button>
      </form>

      {message && (
        <p className="journal-status" role="status">
          {message}
        </p>
      )}

      <div className="expense-history">
        <h3>📋 Expense History</h3>

        {loading ? (
          <p>Loading expenses...</p>
        ) : expenses.length === 0 ? (
          <p>No expenses recorded yet.</p>
        ) : (
          <ul>
            {expenses.map(function (expense) {
              return (
                <li key={expense.id} className="expense-item">
                  <div>
                    <strong>{expense.description}</strong>
                    <p>
                      {expense.category} · {expense.expense_date}
                    </p>
                  </div>

                  <div className="expense-item-actions">
                    <strong>
                      {formatRupees(Number(expense.amount))}
                    </strong>

                    <button
                      type="button"
                      onClick={function () {
                        handleDelete(expense.id);
                      }}
                      disabled={deletingId !== null}
                      aria-label={'Delete ' + expense.description}
                    >
                      {deletingId === expense.id
                        ? 'Deleting...'
                        : 'Delete'}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

export default ExpenseTracker;

