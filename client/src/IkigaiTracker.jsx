
import { useEffect, useState } from "react";
import API_BASE_URL from "./config/api.js";
const API_URL = `${API_BASE_URL}/api/ikigai`;

function IkigaiTracker() {
  // Goals are loaded from the backend instead of localStorage.
  const [goals, setGoals] = useState([]);

  // Form fields.
  const [title, setTitle] = useState("");
  const [reason, setReason] = useState("");
  const [action, setAction] = useState("");
  const [targetDate, setTargetDate] = useState("");

  // API loading and feedback states.
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // Load saved goals from SQLite when the component mounts.
  useEffect(() => {
    let active = true;

    async function loadGoals() {
      try {
        const response = await fetch(API_URL);
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Could not load goals.");
        }

        if (active) {
          // The API returns target_date; the UI uses targetDate.
          const loadedGoals = result.data.map((goal) => ({
            ...goal,
            targetDate: goal.target_date || "",
            completed: Boolean(goal.completed),
          }));

          setGoals(loadedGoals);
        }
      } catch (error) {
        if (active) {
          setMessage(error.message || "Could not connect to the API.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadGoals();

    // Avoid updating state if the component has unmounted.
    return () => {
      active = false;
    };
  }, []);

  // Add a goal to the database.
  async function addGoal(event) {
    event.preventDefault();

    if (!title.trim() || !reason.trim() || !action.trim()) {
      setMessage("Please complete the goal, reason and next action.");
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
        body: JSON.stringify({
          title: title.trim(),
          reason: reason.trim(),
          action: action.trim(),
          target_date: targetDate || null,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Could not save the goal.");
      }

      const savedGoal = {
        ...result.data,
        targetDate: result.data.target_date || "",
        completed: Boolean(result.data.completed),
      };

      // Show the new goal only after the API saves it successfully.
      setGoals((previous) => [savedGoal, ...previous]);

      setTitle("");
      setReason("");
      setAction("");
      setTargetDate("");
      setMessage("Goal saved successfully.");
    } catch (error) {
      setMessage(error.message || "Could not save the goal.");
    } finally {
      setSaving(false);
    }
  }

  // Update completion status in the database.
  async function toggleGoal(id) {
    const goal = goals.find((item) => item.id === id);

    if (!goal) return;

    setMessage("");

    try {
      const response = await fetch(API_URL + "/" + id, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          completed: !goal.completed,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Could not update the goal.");
      }

      const updatedGoal = {
        ...result.data,
        targetDate: result.data.target_date || "",
        completed: Boolean(result.data.completed),
      };

      setGoals((previous) =>
        previous.map((item) => (item.id === id ? updatedGoal : item))
      );
    } catch (error) {
      setMessage(error.message || "Could not update the goal.");
    }
  }

  // Delete a goal from the database.
  async function deleteGoal(id) {
    if (!window.confirm("Delete this goal permanently?")) return;

    setMessage("");

    try {
      const response = await fetch(API_URL + "/" + id, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Could not delete the goal.");
      }

      setGoals((previous) => previous.filter((goal) => goal.id !== id));
      setMessage("Goal deleted successfully.");
    } catch (error) {
      setMessage(error.message || "Could not delete the goal.");
    }
  }

  // Calculate progress from completed goals.
  const completedCount = goals.filter((goal) => goal.completed).length;

  const progress =
    goals.length === 0
      ? 0
      : Math.round((completedCount / goals.length) * 100);

  // Describe how close each target date is.
  function getDateMessage(date) {
    if (!date) return "No target date";

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const target = new Date(date + "T00:00:00");
    const daysLeft = Math.round(
      (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysLeft < 0) return Math.abs(daysLeft) + " days overdue";
    if (daysLeft === 0) return "Due today";
    if (daysLeft === 1) return "Due tomorrow";

    return daysLeft + " days left";
  }

  return (
    <section className="tracker-card ikigai-tracker">
      <p className="principle-label">JAPANESE PRINCIPLE</p>

      <h2>🌱 Ikigai — Purpose &amp; Goals</h2>

      <p>
        Give your goals meaning, then turn that meaning into one small action.
      </p>

      <div className="ikigai-summary">
        <div>
          <strong>{goals.length}</strong>
          <span>Total goals</span>
        </div>

        <div>
          <strong>{completedCount}</strong>
          <span>Completed goals</span>
        </div>

        <div>
          <strong>{progress}%</strong>
          <span>Progress</span>
        </div>
      </div>

      <form className="tracker-form" onSubmit={addGoal}>
        <label htmlFor="goalTitle">What do you want to achieve?</label>
        <input
          id="goalTitle"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="e.g. Become a skilled full-stack developer"
          maxLength={200}
          required
        />

        <label htmlFor="goalReason">Why is this important to you?</label>
        <textarea
          id="goalReason"
          rows="2"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="e.g. To grow my career and support my family"
          maxLength={1000}
          required
        />

        <label htmlFor="goalAction">What is your next small action?</label>
        <input
          id="goalAction"
          value={action}
          onChange={(event) => setAction(event.target.value)}
          placeholder="e.g. Practise React for 30 minutes"
          maxLength={1000}
          required
        />

        <label htmlFor="goalDate">Target date (optional)</label>
        <input
          id="goalDate"
          type="date"
          value={targetDate}
          onChange={(event) => setTargetDate(event.target.value)}
        />

        <button type="submit" disabled={saving}>
          {saving ? "Saving..." : "+ Add Goal"}
        </button>
      </form>

      {message && (
        <p role="status" aria-live="polite">
          {message}
        </p>
      )}

      <div className="practice-history">
        <h3>My Purpose &amp; Goals</h3>

        {loading ? (
          <p className="empty-state">Loading goals...</p>
        ) : goals.length === 0 ? (
          <p className="empty-state">
            Start with one meaningful goal and one action you can take today.
          </p>
        ) : (
          goals.map((goal) => (
            <article
              className={
                "ikigai-entry" +
                (goal.completed ? " ikigai-completed" : "")
              }
              key={goal.id}
            >
              <div className="ikigai-entry-heading">
                <label className="ikigai-checkbox-label">
                  <input
                    type="checkbox"
                    checked={goal.completed}
                    onChange={() => toggleGoal(goal.id)}
                  />

                  <span>{goal.title}</span>
                </label>

                <button
                  type="button"
                  className="delete-button"
                  onClick={() => deleteGoal(goal.id)}
                >
                  Delete
                </button>
              </div>

              <p>
                <strong>Why it matters:</strong> {goal.reason}
              </p>

              <p>
                <strong>Next action:</strong> {goal.action}
              </p>

              {goal.targetDate && (
                <span className="ikigai-deadline">
                  🎯 {goal.targetDate} · {getDateMessage(goal.targetDate)}
                </span>
              )}
            </article>
          ))
        )}
      </div>
    </section>
  );
}

export default IkigaiTracker;

