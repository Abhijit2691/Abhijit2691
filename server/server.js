
require('dotenv').config();
const db = require('./database');

const express = require('express');
const cors = require('cors');

const app = express();

// Use the environment's port when deployed; otherwise use port 5000.
const PORT = process.env.PORT || 5000;

// Allow requests from our local React development server.

const allowedOrigins = [
  'http://localhost:5173',
  'https://localhost',
  'http://localhost',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without an Origin header, such as local tools.
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked origin: ${origin}`));
    },
  })
);


// Automatically parse JSON request bodies into req.body.
app.use(express.json());

// Health-check route to confirm that the API is running.
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Kaizen Diary API is running!',
  });
});

// A simple welcome route for the API.
app.get('/api', (req, res) => {
  res.json({
    name: 'Kaizen Diary API',
    version: '1.0.0',
    principles: [
      'Kakeibo',
      'Kaizen',
      'Mottainai',
      'Hansei',
      'Shokunin',
      'Ikigai',
      'Gaman',
    ],
  });
});



/*
 * GET /api/journal
 * Return all journal entries, newest date first.
 */
app.get('/api/journal', (req, res) => {
  try {
    const entries = db
      .prepare('SELECT * FROM journal_entries ORDER BY entry_date DESC')
      .all();

    res.json({ success: true, data: entries });
  } catch (error) {
    console.error('Could not load journal entries:', error);
    res.status(500).json({ success: false, message: 'Could not load journal entries.' });
  }
});

/*
 * POST /api/journal
 * Create or update the journal entry for a date.
 */
app.post('/api/journal', (req, res) => {
  const { entry_date, habit, lesson, gratitude } = req.body;

  // Validate the required fields before writing to the database.
  if (
    typeof entry_date !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(entry_date) ||
    typeof habit !== 'string' || !habit.trim() ||
    typeof lesson !== 'string' || !lesson.trim() ||
    typeof gratitude !== 'string' || !gratitude.trim()
  ) {
    return res.status(400).json({
      success: false,
      message: 'Provide a valid date, habit, lesson, and gratitude.',
    });
  }

  try {
    // If an entry already exists for this date, update it instead of
    // creating a duplicate. The UNIQUE constraint enforces one entry per day.
    const saveEntry = db.prepare(`
      INSERT INTO journal_entries (entry_date, habit, lesson, gratitude)
      VALUES (@entry_date, @habit, @lesson, @gratitude)
      ON CONFLICT(entry_date) DO UPDATE SET
        habit = excluded.habit,
        lesson = excluded.lesson,
        gratitude = excluded.gratitude
    `);

    saveEntry.run({
      entry_date,
      habit: habit.trim(),
      lesson: lesson.trim(),
      gratitude: gratitude.trim(),
    });

    const savedEntry = db
      .prepare('SELECT * FROM journal_entries WHERE entry_date = ?')
      .get(entry_date);

    res.status(200).json({ success: true, data: savedEntry });
  } catch (error) {
    console.error('Could not save journal entry:', error);
    res.status(500).json({ success: false, message: 'Could not save journal entry.' });
  }
});

// // Start listening for requests.
// app.listen(PORT, () => {
//   console.log(`Kaizen Diary API running at http://localhost:${PORT}`);


  /////////////////////////////



/* =========================================================
   SHOKUNIN — SKILL MASTERY API
   ========================================================= */

// Validate dates in YYYY-MM-DD format.
function isValidShokuninDate(date) {
  if (typeof date !== "string") return false;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false;
  }

  const parsed = new Date(date + "T00:00:00Z");

  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === date
  );
}

// GET: Retrieve all skill practice records.
app.get("/api/shokunin", (req, res) => {
  try {
    const records = db.prepare(`
      SELECT
        id,
        skill,
        minutes,
        learning,
        practice_date,
        created_at
      FROM shokunin_records
      ORDER BY practice_date DESC, id DESC
    `).all();

    res.json({
      success: true,
      data: records,
    });
  } catch (error) {
    console.error("Error loading Shokunin records:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load skill practice records.",
    });
  }
});

// POST: Save a new skill practice session.
app.post("/api/shokunin", (req, res) => {
  try {
    const {
      skill,
      minutes,
      learning = "",
      practice_date,
    } = req.body;

    if (
      typeof skill !== "string" ||
      !skill.trim() ||
      skill.length > 200
    ) {
      return res.status(400).json({
        success: false,
        message: "Enter a skill name of up to 200 characters.",
      });
    }

    if (
      !Number.isInteger(minutes) ||
      minutes < 0 ||
      minutes > 1440
    ) {
      return res.status(400).json({
        success: false,
        message: "Practice minutes must be a whole number from 0 to 1440.",
      });
    }

    if (
      typeof learning !== "string" ||
      learning.length > 2000
    ) {
      return res.status(400).json({
        success: false,
        message: "Learning notes must be text of up to 2000 characters.",
      });
    }

    if (!isValidShokuninDate(practice_date)) {
      return res.status(400).json({
        success: false,
        message: "Provide a valid practice date (YYYY-MM-DD).",
      });
    }

    const result = db.prepare(`
      INSERT INTO shokunin_records (
        skill,
        minutes,
        learning,
        practice_date
      )
      VALUES (?, ?, ?, ?)
    `).run(
      skill.trim(),
      minutes,
      learning.trim(),
      practice_date
    );

    const savedRecord = db.prepare(`
      SELECT
        id,
        skill,
        minutes,
        learning,
        practice_date,
        created_at
      FROM shokunin_records
      WHERE id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({
      success: true,
      message: "Practice session saved successfully.",
      data: savedRecord,
    });
  } catch (error) {
    console.error("Error saving Shokunin record:", error);

    res.status(500).json({
      success: false,
      message: "Failed to save the practice session.",
    });
  }
});

// DELETE: Remove a practice record.
app.delete("/api/shokunin/:id", (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid practice record ID.",
      });
    }

    const result = db.prepare(`
      DELETE FROM shokunin_records
      WHERE id = ?
    `).run(id);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: "Practice record not found.",
      });
    }

    res.json({
      success: true,
      message: "Practice record deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting Shokunin record:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete the practice record.",
    });
  }
});

/////////////////////////////

/* =========================================================
   HANSEI — REFLECTION API
   ========================================================= */

// Validate the reflection date in YYYY-MM-DD format.
function isValidReflectionDate(date) {
  if (typeof date !== "string") return false;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false;
  }

  const parsed = new Date(date + "T00:00:00Z");

  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === date
  );
}

// GET: Retrieve all reflection entries.
app.get("/api/reflections", (req, res) => {
  try {
    const reflections = db.prepare(`
      SELECT
        id,
        win,
        challenge,
        improvement,
        reflection_date,
        created_at
      FROM reflection_entries
      ORDER BY reflection_date DESC, id DESC
    `).all();

    res.json({
      success: true,
      data: reflections,
    });
  } catch (error) {
    console.error("Error loading reflections:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load reflection entries.",
    });
  }
});

// POST: Save a new reflection entry.
app.post("/api/reflections", (req, res) => {
  try {
    const {
      win,
      challenge = "",
      improvement = "",
      reflection_date,
    } = req.body;

    if (typeof win !== "string" || !win.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please enter what went well.",
      });
    }

    if (
      typeof challenge !== "string" ||
      typeof improvement !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Challenge and improvement must be text.",
      });
    }

    if (
      win.length > 2000 ||
      challenge.length > 2000 ||
      improvement.length > 2000
    ) {
      return res.status(400).json({
        success: false,
        message: "Each reflection field must be 2000 characters or fewer.",
      });
    }

    if (!isValidReflectionDate(reflection_date)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid reflection date (YYYY-MM-DD).",
      });
    }

    const result = db.prepare(`
      INSERT INTO reflection_entries (
        win,
        challenge,
        improvement,
        reflection_date
      )
      VALUES (?, ?, ?, ?)
    `).run(
      win.trim(),
      challenge.trim(),
      improvement.trim(),
      reflection_date
    );

    const savedReflection = db.prepare(`
      SELECT
        id,
        win,
        challenge,
        improvement,
        reflection_date,
        created_at
      FROM reflection_entries
      WHERE id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({
      success: true,
      message: "Reflection saved successfully.",
      data: savedReflection,
    });
  } catch (error) {
    console.error("Error saving reflection:", error);

    res.status(500).json({
      success: false,
      message: "Failed to save reflection.",
    });
  }
});

// DELETE: Remove a reflection entry by its ID.
app.delete("/api/reflections/:id", (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid reflection ID.",
      });
    }

    const result = db.prepare(`
      DELETE FROM reflection_entries
      WHERE id = ?
    `).run(id);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: "Reflection entry not found.",
      });
    }

    res.json({
      success: true,
      message: "Reflection deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting reflection:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete reflection.",
    });
  }
});


  /////////////////////

/*
 * =========================================================
 * MOTTAINAI — WASTE TRACKING API
 * =========================================================
 */

// GET /api/mottainai
// Retrieve all waste records, newest first.
app.get("/api/mottainai", (req, res) => {
  try {
    const records = db.prepare(`
      SELECT id, category, description, amount, lesson,
             record_date, created_at
      FROM mottainai_records
      ORDER BY record_date DESC, id DESC
    `).all();

    res.json({ success: true, data: records });
  } catch (error) {
    console.error("Could not load Mottainai records:", error);
    res.status(500).json({
      success: false,
      message: "Could not load waste records.",
    });
  }
});

// POST /api/mottainai
// Create a waste record.
app.post("/api/mottainai", (req, res) => {
  const { category, description, amount = 0, lesson = "", record_date } =
    req.body;

  const allowedCategories = [
    "Money",
    "Food",
    "Time",
    "Water",
    "Electricity",
    "Other",
  ];

  if (
    typeof category !== "string" ||
    !allowedCategories.includes(category)
  ) {
    return res.status(400).json({
      success: false,
      message: "Choose a valid waste category.",
    });
  }

  if (
    typeof description !== "string" ||
    !description.trim() ||
    description.trim().length > 500
  ) {
    return res.status(400).json({
      success: false,
      message: "Enter a description of up to 500 characters.",
    });
  }

  const numericAmount = Number(amount);

  if (
    amount === null ||
    amount === "" ||
    !Number.isFinite(numericAmount) ||
    numericAmount < 0 ||
    numericAmount > 1000000000
  ) {
    return res.status(400).json({
      success: false,
      message: "Amount must be a valid non-negative number.",
    });
  }

  if (typeof lesson !== "string" || lesson.length > 1000) {
    return res.status(400).json({
      success: false,
      message: "Lesson must be 1000 characters or fewer.",
    });
  }

  // Validate that the supplied date is a real YYYY-MM-DD date.
  const dateIsValid =
    typeof record_date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(record_date) &&
    !Number.isNaN(Date.parse(record_date)) &&
    new Date(record_date + "T00:00:00.000Z")
      .toISOString()
      .slice(0, 10) === record_date;

  if (!dateIsValid) {
    return res.status(400).json({
      success: false,
      message: "Provide a valid record date in YYYY-MM-DD format.",
    });
  }

  try {
    const result = db.prepare(`
      INSERT INTO mottainai_records
        (category, description, amount, lesson, record_date)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      category,
      description.trim(),
      numericAmount,
      lesson.trim(),
      record_date
    );

    const savedRecord = db.prepare(`
      SELECT id, category, description, amount, lesson,
             record_date, created_at
      FROM mottainai_records
      WHERE id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({
      success: true,
      data: savedRecord,
    });
  } catch (error) {
    console.error("Could not create Mottainai record:", error);
    res.status(500).json({
      success: false,
      message: "Could not save the waste record.",
    });
  }
});

// PUT /api/mottainai/:id
// Update the fields supplied in the request.
app.put("/api/mottainai/:id", (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid record ID.",
    });
  }

  const fields = [
    "category",
    "description",
    "amount",
    "lesson",
    "record_date",
  ];

  if (!fields.some((field) => Object.hasOwn(req.body, field))) {
    return res.status(400).json({
      success: false,
      message: "Provide at least one field to update.",
    });
  }

  const allowedCategories = [
    "Money",
    "Food",
    "Time",
    "Water",
    "Electricity",
    "Other",
  ];

  const { category, description, amount, lesson, record_date } = req.body;

  if (
    Object.hasOwn(req.body, "category") &&
    (typeof category !== "string" ||
      !allowedCategories.includes(category))
  ) {
    return res.status(400).json({
      success: false,
      message: "Choose a valid waste category.",
    });
  }

  if (
    Object.hasOwn(req.body, "description") &&
    (typeof description !== "string" ||
      !description.trim() ||
      description.trim().length > 500)
  ) {
    return res.status(400).json({
      success: false,
      message: "Enter a description of up to 500 characters.",
    });
  }

  if (
    Object.hasOwn(req.body, "amount") &&
    (amount === null ||
      amount === "" ||
      !Number.isFinite(Number(amount)) ||
      Number(amount) < 0 ||
      Number(amount) > 1000000000)
  ) {
    return res.status(400).json({
      success: false,
      message: "Amount must be a valid non-negative number.",
    });
  }

  if (
    Object.hasOwn(req.body, "lesson") &&
    (typeof lesson !== "string" || lesson.length > 1000)
  ) {
    return res.status(400).json({
      success: false,
      message: "Lesson must be 1000 characters or fewer.",
    });
  }

  if (Object.hasOwn(req.body, "record_date")) {
    const dateIsValid =
      typeof record_date === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(record_date) &&
      !Number.isNaN(Date.parse(record_date)) &&
      new Date(record_date + "T00:00:00.000Z")
        .toISOString()
        .slice(0, 10) === record_date;

    if (!dateIsValid) {
      return res.status(400).json({
        success: false,
        message: "Provide a valid record date in YYYY-MM-DD format.",
      });
    }
  }

  try {
    const existing = db.prepare(`
      SELECT id, category, description, amount, lesson,
             record_date, created_at
      FROM mottainai_records
      WHERE id = ?
    `).get(id);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Waste record not found.",
      });
    }

    // Keep old values for fields that weren't sent.
    const updated = {
      category: Object.hasOwn(req.body, "category")
        ? category
        : existing.category,
      description: Object.hasOwn(req.body, "description")
        ? description.trim()
        : existing.description,
      amount: Object.hasOwn(req.body, "amount")
        ? Number(amount)
        : existing.amount,
      lesson: Object.hasOwn(req.body, "lesson")
        ? lesson.trim()
        : existing.lesson,
      record_date: Object.hasOwn(req.body, "record_date")
        ? record_date
        : existing.record_date,
    };

    db.prepare(`
      UPDATE mottainai_records
      SET category = ?, description = ?, amount = ?,
          lesson = ?, record_date = ?
      WHERE id = ?
    `).run(
      updated.category,
      updated.description,
      updated.amount,
      updated.lesson,
      updated.record_date,
      id
    );

    const savedRecord = db.prepare(`
      SELECT id, category, description, amount, lesson,
             record_date, created_at
      FROM mottainai_records
      WHERE id = ?
    `).get(id);

    res.json({ success: true, data: savedRecord });
  } catch (error) {
    console.error("Could not update Mottainai record:", error);
    res.status(500).json({
      success: false,
      message: "Could not update the waste record.",
    });
  }
});

// DELETE /api/mottainai/:id
// Remove a waste record.
app.delete("/api/mottainai/:id", (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid record ID.",
    });
  }

  try {
    const result = db.prepare(`
      DELETE FROM mottainai_records
      WHERE id = ?
    `).run(id);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: "Waste record not found.",
      });
    }

    res.json({
      success: true,
      message: "Waste record deleted successfully.",
    });
  } catch (error) {
    console.error("Could not delete Mottainai record:", error);
    res.status(500).json({
      success: false,
      message: "Could not delete the waste record.",
    });
  }
});

//////////////////////////
/*
 * =========================================================
 * IKIGAI — PURPOSE & GOALS API
 * =========================================================
 */

// GET /api/ikigai
// Load all goals from the SQLite database.
app.get("/api/ikigai", (req, res) => {
  try {
    const goals = db.prepare(`
      SELECT id, title, reason, action, target_date, completed, created_at
      FROM ikigai_goals
      ORDER BY id DESC
    `).all();

    // Convert SQLite's 0/1 value into a JavaScript boolean.
    const data = goals.map((goal) => ({
      ...goal,
      completed: Boolean(goal.completed),
    }));

    res.json({ success: true, data });
  } catch (error) {
    console.error("Could not load Ikigai goals:", error);
    res.status(500).json({
      success: false,
      message: "Could not load goals.",
    });
  }
});

// POST /api/ikigai
// Create a new goal.
app.post("/api/ikigai", (req, res) => {
  const { title, reason = "", action = "", target_date = null } = req.body;

  if (typeof title !== "string" || !title.trim() || title.trim().length > 200) {
    return res.status(400).json({
      success: false,
      message: "Enter a goal title of up to 200 characters.",
    });
  }

  if (
    typeof reason !== "string" ||
    typeof action !== "string" ||
    reason.length > 1000 ||
    action.length > 1000
  ) {
    return res.status(400).json({
      success: false,
      message: "Reason and action must each be 1000 characters or fewer.",
    });
  }

  // Accept an optional target date in YYYY-MM-DD format.
  if (
    target_date !== null &&
    target_date !== "" &&
    (typeof target_date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(target_date) ||
      Number.isNaN(Date.parse(target_date)))
  ) {
    return res.status(400).json({
      success: false,
      message: "Target date must use YYYY-MM-DD format.",
    });
  }

  try {
    const result = db.prepare(`
      INSERT INTO ikigai_goals (title, reason, action, target_date)
      VALUES (?, ?, ?, ?)
    `).run(
      title.trim(),
      reason.trim(),
      action.trim(),
      target_date || null
    );

    const goal = db.prepare(`
      SELECT id, title, reason, action, target_date, completed, created_at
      FROM ikigai_goals
      WHERE id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({
      success: true,
      data: { ...goal, completed: Boolean(goal.completed) },
    });
  } catch (error) {
    console.error("Could not create Ikigai goal:", error);
    res.status(500).json({
      success: false,
      message: "Could not create goal.",
    });
  }
});

// PUT /api/ikigai/:id
// Update goal details or its completion status.
app.put("/api/ikigai/:id", (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid goal ID.",
    });
  }

  const { title, reason, action, target_date, completed } = req.body;

  // Require at least one supported field.
  const allowedFields = ["title", "reason", "action", "target_date", "completed"];
  if (!allowedFields.some((field) => Object.hasOwn(req.body, field))) {
    return res.status(400).json({
      success: false,
      message: "Provide at least one goal field to update.",
    });
  }

  if (
    Object.hasOwn(req.body, "title") &&
    (typeof title !== "string" || !title.trim() || title.trim().length > 200)
  ) {
    return res.status(400).json({
      success: false,
      message: "Goal title is required and must be at most 200 characters.",
    });
  }

  if (
    (Object.hasOwn(req.body, "reason") &&
      (typeof reason !== "string" || reason.length > 1000)) ||
    (Object.hasOwn(req.body, "action") &&
      (typeof action !== "string" || action.length > 1000))
  ) {
    return res.status(400).json({
      success: false,
      message: "Reason and action must each be 1000 characters or fewer.",
    });
  }

  if (
    Object.hasOwn(req.body, "completed") &&
    typeof completed !== "boolean"
  ) {
    return res.status(400).json({
      success: false,
      message: "Completed must be true or false.",
    });
  }

  if (
    Object.hasOwn(req.body, "target_date") &&
    target_date !== null &&
    target_date !== "" &&
    (typeof target_date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(target_date) ||
      Number.isNaN(Date.parse(target_date)))
  ) {
    return res.status(400).json({
      success: false,
      message: "Target date must use YYYY-MM-DD format.",
    });
  }

  try {
    const existing = db.prepare(`
      SELECT id, title, reason, action, target_date, completed, created_at
      FROM ikigai_goals
      WHERE id = ?
    `).get(id);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Goal not found.",
      });
    }

    // Keep existing values for fields not included in the request.
    const updated = {
      title: Object.hasOwn(req.body, "title") ? title.trim() : existing.title,
      reason: Object.hasOwn(req.body, "reason") ? reason.trim() : existing.reason,
      action: Object.hasOwn(req.body, "action") ? action.trim() : existing.action,
      target_date: Object.hasOwn(req.body, "target_date")
        ? target_date || null
        : existing.target_date,
      completed: Object.hasOwn(req.body, "completed")
        ? Number(completed)
        : existing.completed,
    };

    db.prepare(`
      UPDATE ikigai_goals
      SET title = ?, reason = ?, action = ?, target_date = ?, completed = ?
      WHERE id = ?
    `).run(
      updated.title,
      updated.reason,
      updated.action,
      updated.target_date,
      updated.completed,
      id
    );

    const goal = db.prepare(`
      SELECT id, title, reason, action, target_date, completed, created_at
      FROM ikigai_goals
      WHERE id = ?
    `).get(id);

    res.json({
      success: true,
      data: { ...goal, completed: Boolean(goal.completed) },
    });
  } catch (error) {
    console.error("Could not update Ikigai goal:", error);
    res.status(500).json({
      success: false,
      message: "Could not update goal.",
    });
  }
});

// DELETE /api/ikigai/:id
// Delete a goal.
app.delete("/api/ikigai/:id", (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid goal ID.",
    });
  }

  try {
    const result = db.prepare(`
      DELETE FROM ikigai_goals
      WHERE id = ?
    `).run(id);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: "Goal not found.",
      });
    }

    res.json({
      success: true,
      message: "Goal deleted successfully.",
    });
  } catch (error) {
    console.error("Could not delete Ikigai goal:", error);
    res.status(500).json({
      success: false,
      message: "Could not delete goal.",
    });
  }
});

/////////////////////////////

/*
 * =========================================================
 * GAMAN — SELF-DISCIPLINE API
 * =========================================================
 */

// Validate a real date in YYYY-MM-DD format.
function isValidGamanDate(value) {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return false;
  }

  const date = new Date(value + 'T00:00:00Z');

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

// GET /api/gaman
// Fetch all commitments and their completion history.
app.get('/api/gaman', (req, res) => {
  try {
    const commitments = db.prepare(`
      SELECT id, name, created_at
      FROM gaman_commitments
      ORDER BY id DESC
    `).all();

    const getDates = db.prepare(`
      SELECT completed_date
      FROM gaman_completions
      WHERE commitment_id = ?
      ORDER BY completed_date DESC
    `);

    const data = commitments.map((item) => ({
      id: item.id,
      name: item.name,
      completedDates: getDates.all(item.id).map(
        (record) => record.completed_date
      ),
    }));

    res.json({ success: true, data: data });
  } catch (error) {
    console.error('Could not load Gaman commitments:', error);

    res.status(500).json({
      success: false,
      message: 'Could not load commitments.',
    });
  }
});

// POST /api/gaman
// Create a new commitment.
app.post('/api/gaman', (req, res) => {
  const name = req.body.name;

  if (
    typeof name !== 'string' ||
    !name.trim() ||
    name.trim().length > 200
  ) {
    return res.status(400).json({
      success: false,
      message: 'Enter a commitment of up to 200 characters.',
    });
  }

  try {
    const result = db.prepare(`
      INSERT INTO gaman_commitments (name)
      VALUES (?)
    `).run(name.trim());

    const saved = db.prepare(`
      SELECT id, name, created_at
      FROM gaman_commitments
      WHERE id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({
      success: true,
      data: {
        id: saved.id,
        name: saved.name,
        completedDates: [],
      },
    });
  } catch (error) {
    console.error('Could not create Gaman commitment:', error);

    res.status(500).json({
      success: false,
      message: 'Could not create commitment.',
    });
  }
});

// PUT /api/gaman/:id/completion
// Mark a commitment complete or incomplete for a date.
app.put('/api/gaman/:id/completion', (req, res) => {
  const id = Number(req.params.id);
  const { date, completed } = req.body;

  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Invalid commitment ID.',
    });
  }

  if (
    !isValidGamanDate(date) ||
    typeof completed !== 'boolean'
  ) {
    return res.status(400).json({
      success: false,
      message: 'Provide a valid date and completion status.',
    });
  }

  try {
    const commitment = db.prepare(`
      SELECT id
      FROM gaman_commitments
      WHERE id = ?
    `).get(id);

    if (!commitment) {
      return res.status(404).json({
        success: false,
        message: 'Commitment not found.',
      });
    }

    if (completed) {
      db.prepare(`
        INSERT INTO gaman_completions
          (commitment_id, completed_date)
        VALUES (?, ?)
        ON CONFLICT(commitment_id, completed_date) DO NOTHING
      `).run(id, date);
    } else {
      db.prepare(`
        DELETE FROM gaman_completions
        WHERE commitment_id = ? AND completed_date = ?
      `).run(id, date);
    }

    res.json({
      success: true,
      message: 'Completion status saved.',
    });
  } catch (error) {
    console.error('Could not update Gaman completion:', error);

    res.status(500).json({
      success: false,
      message: 'Could not update completion status.',
    });
  }
});

// DELETE /api/gaman/:id
// Delete a commitment and its completion history.
app.delete('/api/gaman/:id', (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Invalid commitment ID.',
    });
  }

  try {
    // Delete the history and commitment together.
    const deleteCommitment = db.transaction(() => {
      db.prepare(`
        DELETE FROM gaman_completions
        WHERE commitment_id = ?
      `).run(id);

      return db.prepare(`
        DELETE FROM gaman_commitments
        WHERE id = ?
      `).run(id);
    });

    const result = deleteCommitment();

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: 'Commitment not found.',
      });
    }

    res.json({
      success: true,
      message: 'Commitment and its history deleted.',
    });
  } catch (error) {
    console.error('Could not delete Gaman commitment:', error);

    res.status(500).json({
      success: false,
      message: 'Could not delete commitment.',
    });
  }
});
  //////////////////////////////////

/*
 * GET /api/budget
 * Retrieve the saved income and monthly budget.
 */
app.get('/api/budget', (req, res) => {
  try {
    const budget = db.prepare(`
      SELECT monthly_income, monthly_budget
      FROM budget_settings
      WHERE id = 1
    `).get();

    res.json({
      success: true,
      data: budget
    });
  } catch (error) {
    console.error('Could not load budget:', error);

    res.status(500).json({
      success: false,
      message: 'Could not load budget settings.'
    });
  }
});

/*
 * PUT /api/budget
 * Save updated income and monthly budget.
 */
app.put('/api/budget', (req, res) => {
  const { monthly_income, monthly_budget } = req.body;

  if (
    typeof monthly_income !== 'number' ||
    !Number.isFinite(monthly_income) ||
    monthly_income < 0 ||
    monthly_income > 1000000000 ||
    typeof monthly_budget !== 'number' ||
    !Number.isFinite(monthly_budget) ||
    monthly_budget < 0 ||
    monthly_budget > 1000000000
  ) {
    return res.status(400).json({
      success: false,
      message: 'Income and budget must be valid non-negative numbers.'
    });
  }

  try {
    db.prepare(`
      UPDATE budget_settings
      SET monthly_income = ?,
          monthly_budget = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `).run(monthly_income, monthly_budget);

    const budget = db.prepare(`
      SELECT monthly_income, monthly_budget
      FROM budget_settings
      WHERE id = 1
    `).get();

    res.json({
      success: true,
      message: 'Budget settings saved.',
      data: budget
    });
  } catch (error) {
    console.error('Could not save budget:', error);

    res.status(500).json({
      success: false,
      message: 'Could not save budget settings.'
    });
  }
});

////////////////////////////////////////
  const EXPENSE_CATEGORIES = [
  'Food',
  'Transport',
  'Home',
  'Health',
  'Shopping',
  'Learning',
  'Other',
];

// Validate dates using YYYY-MM-DD format.
function isValidExpenseDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

const date = new Date(`${value}T00:00:00Z`);

return !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value;
}

// GET: Fetch all expenses, newest first.
app.get('/api/expenses', (req, res) => {
  try {
    const expenses = db.prepare(`
      SELECT id, description, amount, category, expense_date
      FROM expenses
      ORDER BY expense_date DESC, id DESC
    `).all();

res.json({ success: true, data: expenses });
  } catch (error) {
    console.error('Could not load expenses:', error);

res.status(500).json({
      success: false,
      message: 'Could not load expenses.',
    });
  }
});

// POST: Add a new expense.
app.post('/api/expenses', (req, res) => {
  const { description, amount, category, expense_date } = req.body;

if (
    typeof description !== 'string' ||
    !description.trim() ||
    description.trim().length > 200 ||
    typeof amount !== 'number' ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    amount > 1000000000 ||
    !EXPENSE_CATEGORIES.includes(category) ||
    !isValidExpenseDate(expense_date)
  ) {
    return res.status(400).json({
      success: false,
      message: 'Provide a valid description, positive amount, category, and date.',
    });
  }

try {
    const result = db.prepare(`
      INSERT INTO expenses
        (description, amount, category, expense_date)
      VALUES (?, ?, ?, ?)
    `).run(
      description.trim(),
      amount,
      category,
      expense_date
    );

const savedExpense = db.prepare(`
      SELECT id, description, amount, category, expense_date
      FROM expenses
      WHERE id = ?
    `).get(result.lastInsertRowid);

res.status(201).json({
      success: true,
      data: savedExpense,
    });
  } catch (error) {
    console.error('Could not save expense:', error);

res.status(500).json({
      success: false,
      message: 'Could not save expense.',
    });
  }
});

// DELETE: Remove an expense by its database ID.
app.delete('/api/expenses/:id', (req, res) => {
  const id = Number(req.params.id);

if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Invalid expense ID.',
    });
  }

try {
    const result = db.prepare(
      'DELETE FROM expenses WHERE id = ?'
    ).run(id);

if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found.',
      });
    }

res.json({
      success: true,
      message: 'Expense deleted successfully.',
    });
  } catch (error) {
    console.error('Could not delete expense:', error);

res.status(500).json({
      success: false,
      message: 'Could not delete expense.',
    });
  }
});
////////////////////////////
  const DEFAULT_HABITS = [
  'Exercise for 30 minutes',
  'Read or learn for 20 minutes',
  'Drink enough water',
  'Write my daily journal',
];

// GET: Return the habit records for a selected date.
app.get('/api/habits', (req, res) => {
  const date = req.query.date;

if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({
      success: false,
      message: 'Provide a valid date in YYYY-MM-DD format.',
    });
  }

try {
    const savedRecords = db.prepare(`
      SELECT habit_name, completed
      FROM habit_records
      WHERE record_date = ?
    `).all(date);

// Return the default habits with their saved completion status.
    const habits = DEFAULT_HABITS.map(name => {
      const saved = savedRecords.find(
        record => record.habit_name === name
      );

return {
        name,
        completed: saved ? Boolean(saved.completed) : false,
      };
    });

res.json({ success: true, data: habits });
  } catch (error) {
    console.error('Could not load habits:', error);
    res.status(500).json({
      success: false,
      message: 'Could not load habits.',
    });
  }
});

// POST: Save a habit's completion status for a date.
app.post('/api/habits', (req, res) => {
  const { habit_name, record_date, completed } = req.body;

if (
    typeof habit_name !== 'string' ||
    !DEFAULT_HABITS.includes(habit_name) ||
    typeof record_date !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(record_date) ||
    typeof completed !== 'boolean'
  ) {
    return res.status(400).json({
      success: false,
      message: 'Provide a valid habit, date, and completion status.',
    });
  }

try {
    db.prepare(`
      INSERT INTO habit_records
        (habit_name, record_date, completed)
      VALUES (?, ?, ?)
      ON CONFLICT(habit_name, record_date)
      DO UPDATE SET completed = excluded.completed
    `).run(habit_name, record_date, completed ? 1 : 0);

res.json({
      success: true,
      message: 'Habit progress saved.',
    });
  } catch (error) {
    console.error('Could not save habit:', error);
    res.status(500).json({
      success: false,
      message: 'Could not save habit progress.',
    });
  }
});



// Start the API server after registering all routes.
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Kaizen Diary API running on port ${PORT}`);
  console.log(`Local network URL: http://192.168.29.237:${PORT}`);
});
