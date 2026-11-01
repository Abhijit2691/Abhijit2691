import { useEffect, useState } from "react";
import API_BASE_URL from "./config/api.js";
const API_URL = `${API_BASE_URL}/api/habits`;

// Use the same habit names as DEFAULT_HABITS in server.js.
const DEFAULT_HABITS = [
  "Exercise for 30 minutes",
  "Read or learn for 20 minutes",
  "Drink enough water",
  "Write my daily journal",
];

// Get today's local date without UTC timezone conversion.
function getToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function HabitTracker() {
  const [selectedDate, setSelectedDate] = useState(getToday());

  // Each habit has a name and a completed status.
  const [habits, setHabits] = useState(
    DEFAULT_HABITS.map((name) => ({ name, completed: false })),
  );

  const [loading, setLoading] = useState(true);
  const [savingHabit, setSavingHabit] = useState("");
  const [message, setMessage] = useState("");

  // Load the saved habit status whenever the selected date changes.
  useEffect(() => {
    let cancelled = false;

    async function loadHabits() {
      setLoading(true);
      setMessage("");

      try {
        const response = await fetch(
          `${API_URL}?date=${encodeURIComponent(selectedDate)}`,
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Could not load habits.");
        }

        if (!cancelled) {
          setHabits(result.data);
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(
            "Could not load habits from the server. Check that the backend is running.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadHabits();

    // Ignore an older response if the user changes the date quickly.
    return () => {
      cancelled = true;
    };
  }, [selectedDate]);

  // Calculate how many habits have been completed.
  const completedCount = habits.filter((habit) => habit.completed).length;

  const progress = habits.length
    ? Math.round((completedCount / habits.length) * 100)
    : 0;

  // Save one checkbox change to the backend.
  async function toggleHabit(habitName) {
    const currentHabit = habits.find((habit) => habit.name === habitName);

    if (!currentHabit || savingHabit) return;

    const newCompletedStatus = !currentHabit.completed;
    const dateBeingSaved = selectedDate;

    // Update the screen immediately for a responsive experience.
    setHabits((previous) =>
      previous.map((habit) =>
        habit.name === habitName
          ? { ...habit, completed: newCompletedStatus }
          : habit,
      ),
    );

    setSavingHabit(habitName);
    setMessage("");

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          habit_name: habitName,
          record_date: dateBeingSaved,
          completed: newCompletedStatus,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Could not save habit.");
      }

      setMessage("Progress saved to the database.");
    } catch (error) {
      // Restore the previous checkbox value if saving fails.
      setHabits((previous) =>
        previous.map((habit) =>
          habit.name === habitName
            ? { ...habit, completed: !newCompletedStatus }
            : habit,
        ),
      );

      setMessage(
        "Could not save progress. Please check the backend and try again.",
      );
    } finally {
      setSavingHabit("");
    }
  }

  return (
    <section className="tracker-card">
      <p className="principle-label">JAPANESE PRINCIPLE · KAIZEN</p>

      <h2>✅ Daily Habit Tracker</h2>

      <p>Small actions repeated daily create meaningful improvements.</p>

      <div className="tracker-form">
        <label htmlFor="habitDate">Select date</label>

        <input
          id="habitDate"
          type="date"
          value={selectedDate}
          max={getToday()}
          onChange={(event) => setSelectedDate(event.target.value)}
        />
      </div>

      {loading ? (
        <p>Loading your habits...</p>
      ) : (
        <>
          <div className="habit-progress">
            <div className="habit-progress-summary">
              <strong>
                {completedCount} of {habits.length} completed
              </strong>
              <span>{progress}%</span>
            </div>

            <div
              className="habit-progress-track"
              role="progressbar"
              aria-label="Daily habit completion"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
            >
              <div
                className="habit-progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <ul className="habit-list">
            {habits.map((habit) => (
              <li key={habit.name} className="habit-item">
                <label>
                  <input
                    type="checkbox"
                    checked={habit.completed}
                    disabled={Boolean(savingHabit)}
                    onChange={() => toggleHabit(habit.name)}
                  />

                  <span className={habit.completed ? "habit-completed" : ""}>
                    {habit.name}
                  </span>
                </label>

                {savingHabit === habit.name && <small>Saving...</small>}
              </li>
            ))}
          </ul>
        </>
      )}

      {message && (
        <p className="journal-status" role="status">
          {message}
        </p>
      )}
    </section>
  );
}

export default HabitTracker;

