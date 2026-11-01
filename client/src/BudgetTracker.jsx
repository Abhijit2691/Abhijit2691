
import { useEffect, useState } from 'react';
import API_BASE_URL from "./config/api.js";
const BUDGET_API = `${API_BASE_URL}/api/budget`;
const EXPENSE_API = `${API_BASE_URL}/api/expenses`;

// Return the current month in YYYY-MM format.
function getCurrentMonth() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');

  return year + '-' + month;
}

// Format amounts in Indian Rupees.
function formatRupees(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);
}

function BudgetTracker() {
  const [income, setIncome] = useState('');
  const [monthlyBudget, setMonthlyBudget] = useState('');

  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Load budget settings and expenses from the backend.
  useEffect(function () {
  let cancelled = false;

  // Load saved income and monthly budget from the backend.
  async function loadBudget() {
    try {
      const response = await fetch(BUDGET_API);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error('Could not load budget settings.');
      }

      if (!cancelled) {
        setIncome(String(result.data.monthly_income));
        setMonthlyBudget(String(result.data.monthly_budget));
        setErrorMessage('');
      }
    } catch (error) {
      if (!cancelled) {
        setErrorMessage('Could not load budget settings.');
      }
    } finally {
      if (!cancelled) {
        setLoading(false);
      }
    }
  }

  // Reload expenses from the database.
  async function loadExpenses() {
    try {
      const response = await fetch(EXPENSE_API);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error('Could not load expenses.');
      }

      if (!cancelled) {
        setExpenses(result.data);
        setErrorMessage('');
      }
    } catch (error) {
      if (!cancelled) {
        setErrorMessage(
          'Could not refresh expenses. Check the backend and database.'
        );
      }
    }
  }

  // Load both sets of data when the component first opens.
  loadBudget();
  loadExpenses();

  // Refresh expenses whenever the Expense Tracker signals a change.
  window.addEventListener(
    'kaizen-expenses-updated',
    loadExpenses
  );

  // Remove the listener when the component unmounts.
  return function () {
    cancelled = true;

    window.removeEventListener(
      'kaizen-expenses-updated',
      loadExpenses
    );
  };
}, []);

  // Save income and monthly budget to SQLite using the API.
  async function handleSaveBudget(event) {
    event.preventDefault();

    const incomeValue = Number(income);
    const budgetValue = Number(monthlyBudget);

    if (
      income.trim() === '' ||
      monthlyBudget.trim() === '' ||
      !Number.isFinite(incomeValue) ||
      !Number.isFinite(budgetValue) ||
      incomeValue < 0 ||
      budgetValue < 0 ||
      incomeValue > 1000000000 ||
      budgetValue > 1000000000
    ) {
      setMessage('');
      setErrorMessage(
        'Enter valid non-negative income and budget amounts.'
      );
      return;
    }

    setSaving(true);
    setMessage('');
    setErrorMessage('');

    try {
      const response = await fetch(BUDGET_API, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          monthly_income: incomeValue,
          monthly_budget: budgetValue,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Could not save budget.');
      }

      // Use the values confirmed by the backend.
      setIncome(String(result.data.monthly_income));
      setMonthlyBudget(String(result.data.monthly_budget));
      setMessage('Budget settings saved to the database.');
    } catch (error) {
      setErrorMessage(
        error.message || 'Could not save budget settings.'
      );
    } finally {
      setSaving(false);
    }
  }

  // Only include expenses recorded during the current month.
  const currentMonth = getCurrentMonth();

  const monthlyExpenses = expenses
    .filter(function (expense) {
      return expense.expense_date.startsWith(currentMonth);
    })
    .reduce(function (total, expense) {
      return total + Number(expense.amount);
    }, 0);

  const incomeValue = Number(income) || 0;
  const budgetValue = Number(monthlyBudget) || 0;

  const budgetRemaining = budgetValue - monthlyExpenses;
  const estimatedSavings = incomeValue - monthlyExpenses;

  const budgetUsed = budgetValue > 0
    ? (monthlyExpenses / budgetValue) * 100
    : 0;

  const displayedPercentage = Math.round(budgetUsed);
  const progressWidth = Math.min(budgetUsed, 100);

  return (
    <section className="tracker-card">
      <p className="principle-label">
        JAPANESE PRINCIPLE · KAKEIBO
      </p>

      <h2>💰 Monthly Budget Planner</h2>

      <p>
        Plan your income, manage expenses, and track your savings.
      </p>

      <form className="tracker-form" onSubmit={handleSaveBudget}>
        <label htmlFor="monthlyIncome">Monthly income (₹)</label>

        <input
          id="monthlyIncome"
          type="number"
          min="0"
          max="1000000000"
          step="0.01"
          value={income}
          onChange={function (event) {
            setIncome(event.target.value);
          }}
          placeholder="Enter monthly income"
          required
          disabled={loading || saving}
        />

        <label htmlFor="monthlyBudget">Monthly spending budget (₹)</label>

        <input
          id="monthlyBudget"
          type="number"
          min="0"
          max="1000000000"
          step="0.01"
          value={monthlyBudget}
          onChange={function (event) {
            setMonthlyBudget(event.target.value);
          }}
          placeholder="Enter monthly budget"
          required
          disabled={loading || saving}
        />

        <button type="submit" disabled={loading || saving}>
          {loading
            ? 'Loading...'
            : saving
              ? 'Saving...'
              : 'Save Budget'}
        </button>
      </form>

      {message && (
        <p className="journal-status" role="status">
          {message}
        </p>
      )}

      {errorMessage && (
        <p className="journal-status" role="alert">
          {errorMessage}
        </p>
      )}

      <div className="budget-summary">
        <div className="budget-stat">
          <span>Monthly income</span>
          <strong>{formatRupees(incomeValue)}</strong>
        </div>

        <div className="budget-stat">
          <span>Planned budget</span>
          <strong>{formatRupees(budgetValue)}</strong>
        </div>

        <div className="budget-stat">
          <span>Spent this month</span>
          <strong>{formatRupees(monthlyExpenses)}</strong>
        </div>

        <div className="budget-stat">
          <span>Budget remaining</span>
          <strong className={budgetRemaining < 0 ? 'budget-over' : ''}>
            {formatRupees(budgetRemaining)}
          </strong>
        </div>

        <div className="budget-stat">
          <span>Estimated savings</span>
          <strong className={estimatedSavings < 0 ? 'budget-over' : ''}>
            {formatRupees(estimatedSavings)}
          </strong>
        </div>
      </div>

      <div className="budget-progress">
        <div className="budget-progress-heading">
          <span>Monthly budget used</span>
          <strong>{displayedPercentage}%</strong>
        </div>

        <div
          className="budget-progress-track"
          role="progressbar"
          aria-label="Monthly budget used"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.min(displayedPercentage, 100)}
        >
          <div
            className={
              budgetUsed > 100
                ? 'budget-progress-fill budget-progress-over'
                : 'budget-progress-fill'
            }
            style={{ width: progressWidth + '%' }}
          />
        </div>

        {budgetUsed > 100 && (
          <p className="budget-warning">
            You have exceeded your monthly budget.
          </p>
        )}

        {budgetValue === 0 && (
          <p>Enter a monthly budget to track your spending progress.</p>
        )}
      </div>

      <p className="budget-month">
        Calculations for {currentMonth}
      </p>
    </section>
  );
}

export default BudgetTracker;

