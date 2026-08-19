import { useState } from "react";
import { PatientJourney } from "./components/PatientJourney";
import { PatientDashboard } from "./components/PatientDashboard";
import { HdpApp } from "./hdp/HdpApp";
import { mockPatients } from "./mock/patients";
import { useLivePatients } from "./hooks/useLivePatients";
import { useServiceHealthCheck } from "./hooks/useServiceHealthCheck";
import type { PatientIdentity } from "./types";
import "./App.css";

type ClinicianScreen = "hdp" | "journey";
type UiMode = "clinician" | "patient";

// The backend (ml/patient_store.py) only knows patient_id + clinical
// features — no display identity. This is the frontend's own lookup for the
// two seeded demo patients; an unknown live patient_id just falls back to
// showing the id itself.
const DEMO_PATIENT_IDENTITY: Record<string, { name: string; age: number }> = {
  "demo-1": { name: "Demo Patient A", age: 28 },
  "demo-2": { name: "Demo Patient B", age: 32 },
};

function resolvePatientIdentity(id: string): PatientIdentity {
  const identity = DEMO_PATIENT_IDENTITY[id] ?? { name: id, age: 0 };
  return { id, ...identity };
}

function App() {
  const [uiMode, setUiMode] = useState<UiMode>("clinician");
  const [clinicianScreen, setClinicianScreen] = useState<ClinicianScreen>("hdp");
  const { patients, source: patientSource } = useLivePatients(mockPatients, resolvePatientIdentity);
  const { status: liveStatus, error: liveError, check: handleCheckLiveService } = useServiceHealthCheck();

  if (uiMode === "clinician" && clinicianScreen === "hdp") {
    return (
      <HdpApp
        patients={patients}
        dataSource={patientSource}
        liveStatus={liveStatus}
        liveError={liveError}
        onCheckLive={handleCheckLiveService}
        onOpenPatientMode={() => setUiMode("patient")}
        onOpenJourneyDemo={() => setClinicianScreen("journey")}
      />
    );
  }

  return (
    <div className="app">
      <header className="app__header">
        <div>
          <h1 className="app__title">
            {uiMode === "clinician" ? "Patient journey demo" : "Your Pregnancy Health"}
          </h1>
          <p className="app__subtitle">
            {uiMode === "clinician" ? "Longitudinal risk + guideline RAG walkthrough" : "Patient education & guidance"}
          </p>
        </div>

        <div className="app__mode-switch">
          <button
            className={`app__mode-tab${uiMode === "clinician" ? " app__mode-tab--active" : ""}`}
            onClick={() => {
              setUiMode("clinician");
              setClinicianScreen("hdp");
            }}
          >
            Clinician
          </button>
          <button
            className={`app__mode-tab${uiMode === "patient" ? " app__mode-tab--active" : ""}`}
            onClick={() => setUiMode("patient")}
          >
            Patient
          </button>
        </div>
      </header>

      {uiMode === "patient" ? (
        <main className="app__patient-layout">
          <PatientDashboard />
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
