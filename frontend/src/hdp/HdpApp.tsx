import { useState } from "react";
import type { ClinicianOut, Patient } from "../types";
import type { PatientSource } from "../hooks/useLivePatients";
import type { ServiceHealthStatus } from "../hooks/useServiceHealthCheck";
import { HdpShell } from "./HdpShell";
import type { HdpView } from "./types";
import { deriveAlerts } from "./aggregate";
import { neutral, riskText, riskTint } from "./colors";
import { DashboardView } from "./views/DashboardView";
import { PatientsView } from "./views/PatientsView";
import { PatientDetailView } from "./views/PatientDetailView";
import { QueueView } from "./views/QueueView";
import { GuidesView } from "./views/GuidesView";
import { AlertsView } from "./views/AlertsView";
import { SettingsView } from "./views/SettingsView";
import { AiView } from "./views/AiView";

interface HdpAppProps {
  patients: Patient[];
  dataSource: PatientSource;
  dataError: string | null;
  clinician: ClinicianOut | null;
  liveStatus: ServiceHealthStatus;
  liveError: string | null;
  onCheckLive: () => void;
  onOpenPatientMode: () => void;
  onOpenJourneyDemo: () => void;
}

export function HdpApp({
  patients,
  dataSource,
  dataError,
  clinician,
  liveStatus,
  liveError,
  onCheckLive,
  onOpenPatientMode,
  onOpenJourneyDemo,
}: HdpAppProps) {
  const [view, setView] = useState<HdpView>("dashboard");
  const [query, setQuery] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [pendingQuestion, setPendingQuestion] = useState<{ question: string; patientId: string | null } | null>(null);

  const alertCount = deriveAlerts(patients).length;
  const selectedPatient = selectedPatientId ? patients.find((p) => p.id === selectedPatientId) ?? null : null;

  function openPatient(id: string) {
    setSelectedPatientId(id);
    setView("patient");
  }

  function askAbout(question: string, patientId: string | null) {
    setPendingQuestion({ question, patientId });
    setView("ai");
  }

  return (
    <HdpShell
      view={view}
      onNavigate={setView}
      alertCount={alertCount}
      panelSize={patients.length}
      query={query}
      onQueryChange={setQuery}
      onNewAssessment={() => askAbout("I'd like to start a new risk assessment — what patient information do you need from me?", null)}
      onOpenPatientMode={onOpenPatientMode}
      onOpenJourneyDemo={onOpenJourneyDemo}
      breadcrumbOverride={view === "patient" && selectedPatient ? selectedPatient.name : undefined}
      dataSource={dataSource}
      clinician={clinician}
    >
      {dataSource === "error" && (
        <div
          style={{
            padding: "10px 16px",
            borderRadius: 10,
            background: riskTint("high"),
            color: riskText("high"),
            fontSize: 13,
            marginBottom: 14,
          }}
        >
          Backend unreachable{dataError ? ` — ${dataError}` : ""}. Patient data can't be loaded right now.
        </div>
      )}
      {view === "dashboard" && (
        <DashboardView
          patients={patients}
          clinician={clinician}
          onOpenPatient={openPatient}
          onNavigate={setView}
          onAskFollowUp={(q) => askAbout(q, null)}
        />
      )}
      {view === "patients" && <PatientsView patients={patients} query={query} onOpenPatient={openPatient} />}
      {view === "patient" && selectedPatient && (
        <PatientDetailView
          patient={selectedPatient}
          onBack={() => setView("patients")}
          onAskAboutPatient={(id, q) => askAbout(q, id)}
        />
      )}
      {view === "patient" && !selectedPatient && (
        <div style={{ fontSize: 13, color: neutral.slateSoft }}>No patient selected. Go back to the patient list.</div>
      )}
      {view === "queue" && <QueueView patients={patients} onOpenPatient={openPatient} />}
      {view === "guides" && <GuidesView onAsk={(q) => askAbout(q, null)} />}
      {view === "alerts" && <AlertsView patients={patients} onOpenPatient={openPatient} />}
      {view === "settings" && (
        <SettingsView liveStatus={liveStatus} liveError={liveError} onCheckLive={onCheckLive} clinician={clinician} />
      )}
      {view === "ai" && (
        <AiView patients={patients} pendingQuestion={pendingQuestion} onConsumedPending={() => setPendingQuestion(null)} />
      )}
    </HdpShell>
  );
}
