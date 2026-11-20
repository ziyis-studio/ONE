import type { CSSProperties } from "react";
import type { Page } from "../lib/workspace";
import { PageDate } from "./PageDate";
// Share geometry between the pending and ready overview.
import "./overview.css";
import "./workspace-loading.css";
const titles: Record<Page, string> = {
  home: "Today",
  tasks: "Tasks",
  projects: "Projects",
  schedule: "Schedule",
  habits: "Habits",
  sleep: "Sleep",
  meals: "Meals",
  thoughts: "Thoughts",
  notes: "Notes",
  settings: "Settings",
};
function Bar({
  width = "60%",
  className = "",
}: {
  width?: string;
  className?: string;
}) {
  return <span className={`one-loading-bar ${className}`} style={{ width }} />;
}
function Toolbar() {
  return (
    <div className="one-loading-toolbar">
      <Bar width="150px" />
      <Bar width="220px" />
      <Bar width="110px" />
    </div>
  );
}
function Card({
  className = "",
  short = false,
}: {
  className?: string;
  short?: boolean;
}) {
  return (
    <section className={`card one-loading-card ${className}`}>
      <Bar width="36%" />
      <div className="one-loading-card-body">
        <Bar width="70%" />
        <Bar width="48%" />
        {!short && <Bar width="58%" />}
      </div>
    </section>
  );
}
function Board({ projects = false }: { projects?: boolean }) {
  return (
    <>
      <Toolbar />
      <div className={projects ? "project-board" : "board-scroll"}>
        <div className={projects ? "one-loading-project-lanes" : "task-board"}>
          {Array.from({ length: projects ? 3 : 4 }, (_, index) => (
            <section className="board-lane" key={index}>
              <Bar width="85px" />
              {Array.from({ length: index === 0 ? 3 : 1 }, (_, row) => (
                <div className="one-loading-board-card" key={row}>
                  <Bar width={projects ? "58%" : "34%"} />
                  <Bar width="80%" />
                  <Bar width="66%" />
                  <Bar width="46%" />
                </div>
              ))}
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
function Schedule() {
  return (
    <div className="one-loading-schedule">
      <section className="calendar-workspace">
        <Toolbar />
        <div className="one-loading-weekdays">
          {[0, 1, 2, 3, 4, 5, 6].map((day) => (
            <Bar width="20px" key={day} />
          ))}
        </div>
        <div className="month-calendar">
          {Array.from({ length: 6 }, (_, week) => (
            <div className="month-week" key={week}>
              {Array.from({ length: 7 }, (_, day) => (
                <div className="month-cell one-loading-month-cell" key={day}>
                  <Bar width="16px" />
                  {(week * 7 + day) % 8 === 0 && <Bar width="84%" />}
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>
      <aside className="one-loading-task-panel">
        <Bar width="60px" />
        {[0, 1, 2].map((item) => (
          <div className="one-loading-board-card" key={item}>
            <Bar width="80%" />
            <Bar width="50%" />
          </div>
        ))}
      </aside>
    </div>
  );
}
function Summary() {
  return (
    <div className="one-loading-summary">
      {[0, 1, 2].map((index) => (
        <div key={index}>
          <Bar width="105px" />
          <Bar width="70px" className="one-loading-value" />
        </div>
      ))}
    </div>
  );
}
function Heatmap({ habit = false }: { habit?: boolean }) {
  return (
    <section
      className={
        "one-loading-heatmap " + (habit ? "one-loading-habit-map" : "")
      }
    >
      <Bar width="150px" />
      <div
        className="one-loading-heat-cells"
        style={{ "--loading-columns": habit ? 14 : 36 } as CSSProperties}
      >
        {Array.from({ length: habit ? 56 : 252 }, (_, index) => (
          <i key={index} />
        ))}
      </div>
    </section>
  );
}
export default function WorkspaceLoading({ page }: { page: Page }) {
  return (
    <div
      className={`loading-workspace one-page-loading loading-${page}`}
      role="status"
      aria-label={`Loading ${page === "home" ? "your overview" : titles[page].toLowerCase()}`}
      aria-live="polite"
    >
      <div aria-hidden="true">
        <div className={`page-intro ${page === "home" ? "home-intro" : ""}`}>
          <div>
            <PageDate />
            <div className="one-loading-page-title">{titles[page]}.</div>
            <div className="one-loading-description">
              <Bar width="220px" />
            </div>
          </div>
          {page !== "home" && (
            <Bar width="110px" className="one-loading-action" />
          )}
        </div>
        {page === "home" ? (
          <div className="dashboard-grid one-loading-dashboard">
            <Card className="clock-card" />
            <Card className="pomodoro-card" />
            <Card className="sleep-card" />
            <Card className="habits-card" />
            <Card className="tasks-card" />
            <Card className="timeline-card" />
            <Card className="thoughts-card" short />
            <Card className="notes-card" short />
          </div>
        ) : page === "tasks" || page === "projects" ? (
          <Board projects={page === "projects"} />
        ) : page === "schedule" ? (
          <Schedule />
        ) : page === "sleep" ? (
          <>
            <Summary />
            <Heatmap />
            <div className="one-loading-sleep-detail">
              <Bar width="140px" />
              <Bar width="60%" />
              <Bar width="44%" />
            </div>
          </>
        ) : page === "habits" ? (
          <>
            <Toolbar />
            <Summary />
            <Heatmap habit />
          </>
        ) : page === "thoughts" ? (
          <>
            <Toolbar />
            <div className="thought-layout">
              <section className="thought-timeline one-loading-thoughts">
                {[0, 1, 2].map((index) => (
                  <div key={index}>
                    <Bar width="150px" />
                    <div className="one-loading-thought-row">
                      <Bar width="38px" />
                      <div className="one-loading-board-card">
                        <Bar width="82%" />
                        <Bar width="55%" />
                      </div>
                    </div>
                  </div>
                ))}
              </section>
              <Card className="one-loading-mini-calendar" />
            </div>
          </>
        ) : page === "meals" ? (
          <>
            <Toolbar />
            <Summary />
            <div className="notes-grid">
              {[0, 1, 2].map((i) => (
                <Card key={i} />
              ))}
            </div>
          </>
        ) : page === "notes" ? (
          <>
            <Toolbar />
            <div className="notes-grid">
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <Card key={index} />
              ))}
            </div>
          </>
        ) : (
          <div className="one-loading-settings">
            {[0, 1, 2, 3].map((index) => (
              <section className="one-loading-settings-card" key={index}>
                <Bar width="160px" />
                {[0, 1, 2].map((row) => (
                  <div key={row}>
                    <Bar width="34%" />
                    <Bar width="45%" />
                  </div>
                ))}
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
