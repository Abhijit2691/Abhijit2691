import { useEffect, useState } from "react";
import API_BASE_URL from "./config/api.js";
const API_URL = `${API_BASE_URL}/api/journal`;
const LOCAL_STORAGE_KEY = "kaizen-daily-entry";

// Return today's date in YYYY-MM-DD format.
function getToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// Display a database date in a readable format.
function formatDate(dateString) {
  if (!dateString) return "";

  const [year, month, day] = dateString.split("-");
  return `${day}-${month}-${year}`;
}

function DailyJournal() {
  // The three journal fields.
  const [habit, setHabit] = useState("");
  const [lesson, setLesson] = useState("");
  const [gratitude, setGratitude] = useState("");

  // Keep track of the date currently being viewed or edited.
  const [selectedDate, setSelectedDate] = useState(getToday());

  // Store every journal entry returned by the backend.
  const [entries, setEntries] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // Load journal history when the component first opens.
  useEffect(() => {
    async function loadJournal() {
      try {
        const response = await fetch(API_URL);

        if (!response.ok) {
          throw new Error("Could not load journal history.");
        }

        const result = await response.json();

        if (!result.success || !Array.isArray(result.data)) {
          throw new Error("Invalid journal response.");
        }

        setEntries(result.data);

        // Automatically open today's entry if one exists.
        const todayEntry = result.data.find(
          (entry) => entry.entry_date === getToday(),
        );

        if (todayEntry) {
          selectEntry(todayEntry);
        }
      } catch (error) {
        setMessage(
          "Server unavailable. Your saved database entries may not be visible.",
        );

        // Recover the previous browser backup if available.
        try {
          const backup = localStorage.getItem(LOCAL_STORAGE_KEY);

          if (backup) {
            const oldEntry = JSON.parse(backup);

            setHabit(oldEntry.habit || "");
            setLesson(oldEntry.lesson || "");
            setGratitude(oldEntry.gratitude || "");
            setSelectedDate(oldEntry.entry_date || getToday());
          }
        } catch {
          // Ignore missing or invalid browser backup data.
        }
      } finally {
        setLoading(false);
      }
    }

    loadJournal();
  }, []);

  // Put a selected historical entry into the form.
  function selectEntry(entry) {
    setSelectedDate(entry.entry_date);
    setHabit(entry.habit || "");
    setLesson(entry.lesson || "");
    setGratitude(entry.gratitude || "");
    setMessage("");
  }

  // Clear the form to create or edit today's entry.
  function startToday() {
    const todayEntry = entries.find((entry) => entry.entry_date === getToday());

    if (todayEntry) {
      selectEntry(todayEntry);
    } else {
      setSelectedDate(getToday());
      setHabit("");
      setLesson("");
      setGratitude("");
      setMessage("Ready to write today’s journal.");
    }
  }

  // Save a new entry or update the selected date's entry.
  async function handleSubmit(event) {
    event.preventDefault();

    const entry = {
      entry_date: selectedDate,
      habit: habit.trim(),
      lesson: lesson.trim(),
      gratitude: gratitude.trim(),
    };

    if (!entry.habit || !entry.lesson || !entry.gratitude) {
      setMessage("Please complete all three fields.");
      return;
    }

    setSaving(true);
    setMessage("");

    // Save a browser backup in case the server is unavailable.
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(entry));

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(entry),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Could not save journal.");
      }

      // Replace the saved date in the history list.
      setEntries((previousEntries) => {
        const updatedEntries = previousEntries.filter(
          (item) => item.entry_date !== result.data.entry_date,
        );

        return [result.data, ...updatedEntries].sort((a, b) =>
          b.entry_date.localeCompare(a.entry_date),
        );
      });

      setMessage("Journal saved successfully to the database!");
    } catch (error) {
      setMessage(
        "Could not reach the server. Your entry is backed up in this browser; try saving again later.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section className="tracker-card">
        <h2>📔 Daily Journal</h2>
        <p>Loading your journal history...</p>
      </section>
    );
  }

  return (
    <section className="tracker-card">
      <p className="principle-label">JAPANESE PRINCIPLE · KAIZEN</p>

      <h2>📔 Daily Journal</h2>

      <p>Reflect on your day and make one small improvement tomorrow.</p>

      {/* The left-side history lets you revisit earlier dates. */}
      <div className="journal-layout">
        <aside className="journal-history">
          <h3>📚 Journal History</h3>

          <button type="button" onClick={startToday}>
            + Today's Entry
          </button>

          {entries.length === 0 ? (
            <p>No saved entries yet. Write your first journal!</p>
          ) : (
            <ul>
              {entries.map((entry) => (
                <li key={entry.entry_date}>
                  <button
                    type="button"
                    className={
                      selectedDate === entry.entry_date
                        ? "journal-history-item selected"
                        : "journal-history-item"
                    }
                    onClick={() => selectEntry(entry)}
                  >
                    <strong>{formatDate(entry.entry_date)}</strong>
                    <span>{entry.habit}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <div className="journal-editor">
          <h3>
            {selectedDate === getToday()
              ? "Today's Journal"
              : `Journal · ${formatDate(selectedDate)}`}
          </h3>

          <form className="tracker-form" onSubmit={handleSubmit}>
            <label htmlFor="journalDate">Journal date</label>

            <input
              id="journalDate"
              type="date"
              value={selectedDate}
              max={getToday()}
              onChange={(event) => {
                const date = event.target.value;
                setSelectedDate(date);

                // Load an existing entry for this date, if available.
                const existingEntry = entries.find(
                  (entry) => entry.entry_date === date,
                );

                if (existingEntry) {
                  setHabit(existingEntry.habit || "");
                  setLesson(existingEntry.lesson || "");
                  setGratitude(existingEntry.gratitude || "");
                } else {
                  setHabit("");
                  setLesson("");
                  setGratitude("");
                }

                setMessage("");
              }}
              required
            />

            <label htmlFor="journalHabit">One good habit I practised</label>
            <textarea
              id="journalHabit"
              rows="3"
              value={habit}
              onChange={(event) => setHabit(event.target.value)}
              placeholder="What positive action did you take?"
              required
            />

            <label htmlFor="journalLesson">What did I learn?</label>
            <textarea
              id="journalLesson"
              rows="3"
              value={lesson}
              onChange={(event) => setLesson(event.target.value)}
              placeholder="What did you learn or improve?"
              required
            />

            <label htmlFor="journalGratitude">What am I grateful for?</label>
            <textarea
              id="journalGratitude"
              rows="3"
              value={gratitude}
              onChange={(event) => setGratitude(event.target.value)}
              placeholder="What are you thankful for today?"
              required
            />

            <button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Journal"}
            </button>
          </form>

          {message && (
            <p className="journal-status" role="status">
              {message}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

export default DailyJournal;

