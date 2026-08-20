import { usePatientTrajectory } from "../hooks/usePatientTrajectory";
import type { RagQueryResponse } from "../types";
import type { RagQueryStatus } from "../hooks/useRagQuery";
import { PatientRiskSummary } from "./PatientRiskSummary";
import { PatientChat } from "./PatientChat";
import "./PatientDashboard.css";

interface PatientDashboardProps {
  chatStatus: RagQueryStatus;
  chatResult: RagQueryResponse | null;
  chatError: string | null;
  chatAsk: (question: string, mode: "patient") => Promise<void>;
}

export function PatientDashboard({ chatStatus, chatResult, chatError, chatAsk }: PatientDashboardProps) {
  const { riskResult, status, error } = usePatientTrajectory();

  return (
    <div className="patient-dashboard">
      <section className="patient-dashboard__intro">
        <h2 className="patient-dashboard__title">Your pregnancy health</h2>
        <p className="patient-dashboard__subtitle">
          {status === "loading" && "Loading your information…"}
          {status === "success" && "Showing your latest recorded information."}
          {status === "error" && (error ?? "Couldn't load your information — check your connection and try again.")}
        </p>
      </section>

      {riskResult && <PatientRiskSummary riskResult={riskResult} />}
      <PatientChat status={chatStatus} result={chatResult} error={chatError} ask={chatAsk} />
    </div>
  );
}
