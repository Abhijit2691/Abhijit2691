
import { useEffect, useState } from "react";
import "./App.css";

import DailyJournal from "./DailyJournal";
import HabitTracker from "./HabitTracker";
import ExpenseTracker from "./ExpenseTracker";
import BudgetTracker from "./BudgetTracker";
import ReflectionTracker from "./ReflectionTracker";
import ShokuninTracker from "./ShokuninTracker";
import MottainaiTracker from "./MottainaiTracker";
import GamanTracker from "./GamanTracker";
import IkigaiTracker from "./IkigaiTracker";

const navigationItems = [
  { id: "budget", label: "Kakeibo · Budget" },
  { id: "expenses", label: "Expenses" },
  { id: "habits", label: "Kaizen · Habits" },
  { id: "journal", label: "Daily Journal" },
  { id: "reflection", label: "Hansei · Reflection" },
  { id: "shokunin", label: "Shokunin · Skills" },
  { id: "mottainai", label: "Mottainai · Waste" },
  { id: "gaman", label: "Gaman · Discipline" },
  { id: "ikigai", label: "Ikigai · Goals" },
];

const sceneNames = {
  budget: "Kakeibo",
  expenses: "Mottainai",
  habits: "Kaizen",
  journal: "Your Daily Story",
  reflection: "Hansei",
  shokunin: "Shokunin",
  mottainai: "Mottainai",
  gaman: "Gaman",
  ikigai: "Ikigai",
};

function DashboardNavigation({ onSelect }) {
  return (
    <nav className="dashboard-nav" aria-label="Dashboard sections">
      {navigationItems.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          onClick={() => onSelect(item.id)}
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}


function AnimeBackground({ mode, scene, day }) {
  const season =
    day <= 90
      ? "spring"
      : day <= 180
        ? "summer"
        : day <= 270
          ? "autumn"
          : "winter";

  return (
    <div
      className={`anime-backdrop anime-mode-${mode} anime-scene-${scene} anime-day-${day} anime-season-${season}`}
      aria-hidden="true"
    >
      <div className="anime-sky" />
      <div className="anime-sun" />

      <div className="anime-cloud anime-cloud-one" />
      <div className="anime-cloud anime-cloud-two" />
      <div className="anime-cloud anime-cloud-three" />

      <div className="anime-birds">
        <span className="anime-bird anime-bird-one" />
        <span className="anime-bird anime-bird-two" />
        <span className="anime-bird anime-bird-three" />
      </div>

      <div className="anime-fuji">
        <span className="anime-fuji-snow" />
      </div>
      <div className="anime-mountain anime-mountain-back" />
      <div className="anime-mountain anime-mountain-mid" />
      <div className="anime-mountain anime-mountain-front" />

      <div className="anime-mist anime-mist-one" />
      <div className="anime-mist anime-mist-two" />

      <div className="anime-far-village">
        <span className="anime-house anime-house-one" />
        <span className="anime-house anime-house-two" />
      </div>

      <div className="anime-water">
        <span className="anime-water-glint anime-water-glint-one" />
        <span className="anime-water-glint anime-water-glint-two" />
        <span className="anime-water-glint anime-water-glint-three" />
      </div>

      <div className="anime-torii">
        <span className="anime-torii-post anime-torii-post-left" />
        <span className="anime-torii-post anime-torii-post-right" />
      </div>
      <div className="anime-bridge">
        <span className="anime-bridge-deck" />
        <span className="anime-bridge-rail" />
      </div>

      <div className="anime-tree anime-tree-left" />
      <div className="anime-tree anime-tree-right" />
      <div className="anime-tree anime-tree-mid" />
      <div className="anime-forest" />
      <div className="anime-ground" />
      <div className="anime-path" />

      <div className="anime-lantern anime-lantern-left">
        <span />
      </div>
      <div className="anime-lantern anime-lantern-right">
        <span />
      </div>

      <div className="anime-petals">
        {Array.from({ length: 18 }, (_, index) => (
          <span
            key={index}
            className={`anime-petal anime-petal-${index + 1}`}
          />
        ))}
      </div>

      <div className="anime-fireflies">
        {Array.from({ length: 9 }, (_, index) => (
          <span key={index} className={`anime-firefly anime-firefly-${index + 1}`} />
        ))}
      </div>
    </div>
  );
}



const JOURNEY_START_KEY = "kaizenJourneyStartDate";

function getJourneyDay() {
  try {
    let startDate = localStorage.getItem(JOURNEY_START_KEY);

    if (!startDate) {
      startDate = new Date().toLocaleDateString("en-CA");
      localStorage.setItem(JOURNEY_START_KEY, startDate);
    }

    const start = new Date(`${startDate}T00:00:00`);
    const today = new Date();

    today.setHours(0, 0, 0, 0);

    const difference = Math.floor(
      (today.getTime() - start.getTime()) / 86400000
    );

    return Math.min(365, Math.max(1, difference + 1));
  } catch {
    return 1;
  }
}

function App() {


const [journeyDay, setJourneyDay] = useState(getJourneyDay);

  const [backgroundMode, setBackgroundMode] = useState(() => {
    try {
      return localStorage.getItem("kaizenBackgroundMode") || "stories";
    } catch {
      return "stories";
    }
  });

  const [activeScene, setActiveScene] = useState("habits");

  useEffect(() => {
    try {
      localStorage.setItem("kaizenBackgroundMode", backgroundMode);
    } catch {
      // The app still works if browser storage is unavailable.
    }
  }, [backgroundMode]);

  const toggleBackgroundMode = () => {
    setBackgroundMode((current) =>
      current === "stories" ? "journey" : "stories"
    );
  };

  const startJournal = () => {
    setActiveScene("journal");
    document.getElementById("journal")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <>
      <AnimeBackground
  mode={backgroundMode}
  scene={activeScene}
  day={journeyDay}
/>

      <div className="app">
        <DashboardNavigation onSelect={setActiveScene} />

        <header className="header">
          <div className="header-content">
            <p className="eyebrow">365 DAYS TO A BETTER LIFE</p>
            <h1>Kaizen Diary</h1>
            <p className="subtitle">
              Small steps. Better habits. A meaningful life.
            </p>

            <div className="anime-mode-control">
              <span className="mode-caption">YOUR ANIME WORLD</span>

              <button
                type="button"
                className="anime-mode-toggle"
                onClick={toggleBackgroundMode}
                aria-label={`Switch to ${
                  backgroundMode === "stories"
                    ? "365-Day Journey"
                    : "Technique Stories"
                } background`}
              >
                <span className="mode-icon">
                  {backgroundMode === "stories" ? "🌸" : "⛩️"}
                </span>

                <span>
                  <strong>
                    {backgroundMode === "stories"
                      ? "Technique Stories"
                      : "365-Day Journey"}
                  </strong>
                  <small>Switch anime world ↗</small>
                </span>
              </button>

              <p className="mode-description">
                {backgroundMode === "stories"
                  ? `Current chapter: ${sceneNames[activeScene] || "Kaizen"}`
                  : "One continuous journey, one better day at a time."}
              </p>
            </div>
          </div>

          <div className="date-card">
            <span>YOUR JOURNEY</span>
            <strong>
  Day {String(journeyDay).padStart(2, "0")} / 365
</strong>
          </div>
        </header>

        <main className="dashboard-content">
          <section className="welcome">
            <p className="eyebrow">YOUR DAILY RESET</p>
            <h2>Become 1% better today.</h2>
            <p>
              Reflect, learn, save, and build the life you want—one day at a
              time.
            </p>
            <button type="button" onClick={startJournal}>
              Start today's journal →
            </button>
          </section>

          <section className="section">
            <div className="section-heading">
              <div>
                <h2>Your seven principles</h2>
                <p>Ancient wisdom for modern living.</p>
              </div>
            </div>

            <div className="principles">
              <article className="principle">
                <span className="symbol">¥</span>
                <h3>Kakeibo</h3>
                <p>Track spending and save mindfully.</p>
              </article>

              <article className="principle">
                <span className="symbol">↗</span>
                <h3>Kaizen</h3>
                <p>Improve a little every day.</p>
              </article>

              <article className="principle">
                <span className="symbol">♻</span>
                <h3>Mottainai</h3>
                <p>Respect resources and reduce waste.</p>
              </article>

              <article className="principle">
                <span className="symbol">↺</span>
                <h3>Hansei</h3>
                <p>Reflect, learn, and do better.</p>
              </article>

              <article className="principle">
                <span className="symbol">✳</span>
                <h3>Shokunin</h3>
                <p>Master your craft through practice.</p>
              </article>

              <article className="principle">
                <span className="symbol">◎</span>
                <h3>Ikigai</h3>
                <p>Discover purpose in everyday life.</p>
              </article>

              <article className="principle">
                <span className="symbol">⛰</span>
                <h3>Gaman</h3>
                <p>Practice patience and self-discipline.</p>
              </article>
            </div>
          </section>

          <section className="quote">
            <p className="eyebrow">A THOUGHT TO REMEMBER</p>
            <blockquote>
              “Great things are done by a series of small things brought
              together.”
            </blockquote>
            <p>— Vincent van Gogh</p>
          </section>

          <section id="budget" className="dashboard-section">
            <BudgetTracker />
          </section>

          <section id="expenses" className="dashboard-section">
            <ExpenseTracker />
          </section>

          <section id="habits" className="dashboard-section">
            <HabitTracker />
          </section>

          <section id="journal" className="dashboard-section">
            <DailyJournal />
          </section>

          <section id="reflection" className="dashboard-section">
            <ReflectionTracker />
          </section>

          <section id="shokunin" className="dashboard-section">
            <ShokuninTracker />
          </section>

          <section id="mottainai" className="dashboard-section">
            <MottainaiTracker />
          </section>

          <section id="gaman" className="dashboard-section">
            <GamanTracker />
          </section>

          <section id="ikigai" className="dashboard-section">
            <IkigaiTracker />
          </section>
        </main>

        <footer>
          <p>KAIZEN DIARY · Every day is a new beginning.</p>
        </footer>
      </div>
    </>
  );
}

export default App;
