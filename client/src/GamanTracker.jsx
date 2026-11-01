
import { useEffect, useState } from "react";
import API_BASE_URL from "./config/api.js";
const API_URL = `${API_BASE_URL}/api/gaman`;

// Use the computer's local calendar date, not UTC.
function getToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function GamanTracker() {
  // Store commitments returned by the backend API.
  const [commitments, setCommitments] = useState([]);
  const [commitmentName, setCommitmentName] = useState("");

  // Track loading, saving and error messages.
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // Load commitments from SQLite through the API when mounted.
  useEffect(() => {
    let active = true;

    async function loadCommitments() {
      try {
        const response = await fetch(API_URL);
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Could not load commitments.");
        }

        if (active) {
          setCommitments(result.data);
        }
      } catch (error) {
        if (active) {
          setMessage(
            error.message || "Could not connect to the Gaman API."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadCommitments();

    // Prevent state updates if the component unmounts.
    return () => {
      active = false;
    };
  }, []);

  // Add a new commitment to the database.
  async function addCommitment(event) {
    event.preventDefault();

    const name = commitmentName.trim();

    if (!name) {
      setMessage("Please enter a commitment.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Could not add commitment.");
      }

      // Use the ID created by SQLite, not Date.now().
      setCommitments((previous) => [...previous, result.data]);
      setCommitmentName("");
      setMessage("Commitment added successfully.");
    } catch (error) {
      setMessage(error.message || "Could not add commitment.");
    } finally {
      setSaving(false);
    }
  }

  // Save today's completion status through the API.
  async function toggleToday(id) {
    const today = getToday();
    const item = commitments.find((commitment) => commitment.id === id);

    if (!item) return;

    const alreadyCompleted = item.completedDates.includes(today);

    setMessage("");

    try {
      const response = await fetch(
        API_URL + "/" + id + "/completion",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            date: today,
            completed: !alreadyCompleted,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Could not update completion status."
        );
      }

      // Update the screen only after the database update succeeds.
      setCommitments((previous) =>
        previous.map((commitment) => {
          if (commitment.id !== id) return commitment;

          return {
            ...commitment,
            completedDates: alreadyCompleted
              ? commitment.completedDates.filter(
                  (date) => date !== today
                )
              : [...commitment.completedDates, today],
          };
        })
      );
    } catch (error) {
      setMessage(error.message || "Could not update completion.");
    }
  }

  // Delete a commitment and its completion history.
  async function deleteCommitment(id) {
    const confirmed = window.confirm(
      "Delete this commitment and its completion history?"
    );

    if (!confirmed) return;

    setMessage("");

    try {
      const response = await fetch(API_URL + "/" + id, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Could not delete commitment.");
      }

      setCommitments((previous) =>
        previous.filter((item) => item.id !== id)
      );

      setMessage("Commitment deleted successfully.");
    } catch (error) {
      setMessage(error.message || "Could not delete commitment.");
    }
  }

  // Count consecutive completed days ending today or yesterday.
  function calculateStreak(completedDates) {
    const completed = new Set(completedDates);
    const cursor = new Date();

    // Noon avoids common midnight/daylight-saving date issues.
    cursor.setHours(12, 0, 0, 0);

    if (!completed.has(getToday())) {
      cursor.setDate(cursor.getDate() - 1);
    }

    let streak = 0;

    while (true) {
      const year = cursor.getFullYear();
      const month = String(cursor.getMonth() + 1).padStart(2, "0");
      const day = String(cursor.getDate()).padStart(2, "0");
      const dateKey = `${year}-${month}-${day}`;

      if (!completed.has(dateKey)) break;

      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    return streak;
  }

  const today = getToday();

  // Count how many commitments are completed today.
  const completedToday = commitments.filter((item) =>
    item.completedDates.includes(today)
  ).length;

  const completionPercentage =
    commitments.length === 0
      ? 0
      : Math.round((completedToday / commitments.length) * 100);

  return (
    <section className="tracker-card gaman-tracker">
      <p className="principle-label">JAPANESE PRINCIPLE</p>

      <h2>🔥 Gaman — Self-Discipline</h2>

      <p>
        Keep promises to yourself. Progress comes from small actions repeated
        consistently.
      </p>

      <div className="gaman-summary">
        <div>
          <strong>
            {completedToday}/{commitments.length}
          </strong>
          <span>Completed today</span>
        </div>

        <div>
          <strong>{completionPercentage}%</strong>
          <span>Today's completion</span>
        </div>
      </div>

      <form className="tracker-form" onSubmit={addCommitment}>
        <label htmlFor="commitmentName">Your daily commitment</label>

        <input
          id="commitmentName"
          type="text"
          placeholder="e.g. Practise coding for 30 minutes"
          value={commitmentName}
          onChange={(event) => setCommitmentName(event.target.value)}
          maxLength={200}
          required
        />

        <button type="submit" disabled={saving}>
          {saving ? "Saving..." : "+ Add Commitment"}
        </button>
      </form>

      {/* Display API success and error messages. */}
      {message && (
        <p role="status" aria-live="polite">
          {message}
        </p>
      )}

      <div className="practice-history">
        <h3>My Daily Commitments</h3>

        {loading ? (
          <p className="empty-state">Loading commitments...</p>
        ) : commitments.length === 0 ? (
          <p className="empty-state">
            Start with one realistic commitment you can repeat every day.
          </p>
        ) : (
          commitments.map((item) => {
            const doneToday = item.completedDates.includes(today);
            const streak = calculateStreak(item.completedDates);

            return (
              <article className="gaman-entry" key={item.id}>
                <div className="gaman-entry-main">
                  <label className="gaman-checkbox-label">
                    <input
                      type="checkbox"
                      checked={doneToday}
                      onChange={() => toggleToday(item.id)}
                    />

                    <span className={doneToday ? "gaman-done" : ""}>
                      {item.name}
                    </span>
                  </label>

                  <span className="gaman-streak">
                    🔥 {streak}-day streak
                  </span>
                </div>

                <button
                  type="button"
                  className="delete-button"
                  onClick={() => deleteCommitment(item.id)}
                >
                  Delete
                </button>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}

export default GamanTracker;

