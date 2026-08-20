import { useState } from "react";
import { PatientJourney } from "./components/PatientJourney";
import { PatientDashboard } from "./components/PatientDashboard";
import { HdpApp } from "./hdp/HdpApp";
import { useLivePatients } from "./hooks/useLivePatients";
import { useServiceHealthCheck } from "./hooks/useServiceHealthCheck";
import { useClinician } from "./hooks/useClinician";
import { useRagQuery } from "./hooks/useRagQuery";
import "./App.css";

type ClinicianScreen = "hdp" | "journey";
type UiMode = "clinician" | "patient";

function App() {
  const [uiMode, setUiMode] = useState<UiMode>("clinician");
  const [clinicianScreen, setClinicianScreen] = useState<ClinicianScreen>("hdp");
  const { patients, source: patientSource, error: patientError } = useLivePatients();
  const { status: liveStatus, error: liveError, check: handleCheckLiveService } = useServiceHealthCheck();
  const { clinician } = useClinician();
  // Instantiated here (above the uiMode branch below) rather than inside
  // PatientChat, so switching to Clinician mode and back doesn't wipe
  // whatever answer the patient was just shown — same unmount pitfall as
  // HdpApp's Ask AI history, fixed the same way.
  const patientChat = useRagQuery("patient-chat");

  if (uiMode === "clinician" && clinicianScreen === "hdp") {
    return (
      <HdpApp
        patients={patients}
        dataSource={patientSource}
        dataError={patientError}
        clinician={clinician}
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
          <PatientDashboard
            chatStatus={patientChat.status}
            chatResult={patientChat.data}
            chatError={patientChat.error}
            chatAsk={patientChat.ask}
          />
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
