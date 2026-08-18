import { useState } from "react";
import { RiskCard } from "./components/RiskCard";
import { TrajectoryChart } from "./components/TrajectoryChart";
import { DriversList } from "./components/DriversList";
import { PatientQueue } from "./components/PatientQueue";
import { PatientJourney } from "./components/PatientJourney";
import { mockPatients } from "./mock/patients";
import { predict, PredictionError } from "./api";
import "./App.css";

type LiveStatus = "idle" | "loading" | "success" | "error";
type View = "dashboard" | "journey";

function App() {
  const [view, setView] = useState<View>("dashboard");
  const [selectedId, setSelectedId] = useState(mockPatients[0].id);
  const [liveStatus, setLiveStatus] = useState<LiveStatus>("idle");
  const [liveError, setLiveError] = useState<string | null>(null);

  const selectedPatient = mockPatients.find((p) => p.id === selectedId) ?? mockPatients[0];

  async function handleCheckLiveService() {
    setLiveStatus("loading");
    setLiveError(null);
    try {
      // Demo call only — the dashboard always renders from mock data below,
      // regardless of outcome. This just proves the error-handling path.
      await predict({});
      setLiveStatus("success");
    } catch (error) {
      setLiveStatus("error");
      setLiveError(error instanceof PredictionError ? error.message : "Unexpected error");
    }
  }

  return (
    <div className="app">
      <header className="app__header">
        <div>
          <h1 className="app__title">Clinical Risk Dashboard</h1>
          <p className="app__subtitle">Disease-agnostic scaffold &middot; mock data</p>
        </div>
        <div className="app__view-switch">
          <button
            className={`app__view-tab${view === "dashboard" ? " app__view-tab--active" : ""}`}
            onClick={() => setView("dashboard")}
          >
            Dashboard
          </button>
          <button
            className={`app__view-tab${view === "journey" ? " app__view-tab--active" : ""}`}
            onClick={() => setView("journey")}
          >
            Patient journey demo
          </button>
        </div>
        {view === "dashboard" && (
          <div className="app__live-check">
            <button
              className="app__live-button"
              onClick={handleCheckLiveService}
              disabled={liveStatus === "loading"}
            >
              {liveStatus === "loading" ? "Checking…" : "Check live ML service"}
            </button>
            {liveStatus === "success" && (
              <span className="app__live-status app__live-status--ok">ML service reachable</span>
            )}
            {liveStatus === "error" && (
              <span className="app__live-status app__live-status--error" title={liveError ?? undefined}>
                Mock mode &middot; {liveError}
              </span>
            )}
          </div>
        )}
      </header>
      {view === "dashboard" ? (
        <main className="app__layout">
          <section className="app__detail">
            <RiskCard
              riskResult={selectedPatient.riskResult}
              subtitle={`${selectedPatient.name} · ${selectedPatient.age}y · ${selectedPatient.id}`}
            />
            <TrajectoryChart trajectory={selectedPatient.riskResult.trajectory} />
            <DriversList drivers={selectedPatient.riskResult.drivers} />
          </section>
          <section className="app__queue">
            <PatientQueue patients={mockPatients} selectedId={selectedId} onSelect={setSelectedId} />
          </section>
        </main>
      ) : (
        <main className="app__journey-layout">
          <PatientJourney />
        </main>
      )}
    </div>
  );
}

export default App;
