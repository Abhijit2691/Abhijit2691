
const Database = require('better-sqlite3');
const path = require('path');

// Keep the database file in the server folder.
// It will persist even when Node.js is restarted.
const databasePath = path.join(__dirname, 'kaizen.db');
const db = new Database(databasePath);

// Create a table for daily journal entries if it doesn't exist yet.
db.exec(`
  CREATE TABLE IF NOT EXISTS journal_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_date TEXT NOT NULL UNIQUE,
    habit TEXT NOT NULL,
    lesson TEXT NOT NULL,
    gratitude TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS habit_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  habit_name TEXT NOT NULL,
  record_date TEXT NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(habit_name, record_date)
);
CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  description TEXT NOT NULL,
  amount REAL NOT NULL CHECK (amount > 0),
  category TEXT NOT NULL,
  expense_date TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS budget_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    monthly_income REAL NOT NULL DEFAULT 0,
    monthly_budget REAL NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  INSERT OR IGNORE INTO budget_settings
    (id, monthly_income, monthly_budget)
  VALUES (1, 0, 0);

    -- Store each user's daily commitments.
  CREATE TABLE IF NOT EXISTS gaman_commitments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  -- Store each completion separately, one record per commitment per day.
  CREATE TABLE IF NOT EXISTS gaman_completions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    commitment_id INTEGER NOT NULL,
    completed_date TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (commitment_id)
      REFERENCES gaman_commitments(id)
      ON DELETE CASCADE,

    UNIQUE(commitment_id, completed_date)
  );

-- Store personal goals and their purpose.
CREATE TABLE IF NOT EXISTS ikigai_goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  action TEXT NOT NULL DEFAULT '',
  target_date TEXT,
  completed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Track wasted resources and the lessons learned.
CREATE TABLE IF NOT EXISTS mottainai_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  lesson TEXT NOT NULL DEFAULT '',
  record_date TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS reflection_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    win TEXT NOT NULL,
    challenge TEXT NOT NULL DEFAULT '',
    improvement TEXT NOT NULL DEFAULT '',
    reflection_date TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- Shokunin: Track skill practice and learning.
CREATE TABLE IF NOT EXISTS shokunin_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    skill TEXT NOT NULL,
    minutes INTEGER NOT NULL DEFAULT 0,
    learning TEXT NOT NULL DEFAULT '',
    practice_date TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`);




module.exports = db;
