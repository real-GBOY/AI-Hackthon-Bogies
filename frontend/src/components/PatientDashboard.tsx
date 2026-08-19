import { usePatientTrajectory } from "../hooks/usePatientTrajectory";
import { mockPatients } from "../mock/patients";
import { PatientRiskSummary } from "./PatientRiskSummary";
import { PatientChat } from "./PatientChat";
import "./PatientDashboard.css";

export function PatientDashboard() {
  // Real backend not reachable — same justification as the clinician
  // dashboard's mock fallback (README's "Known housekeeping" section): the
  // demo must keep working with the ML service down.
  const { riskResult, status } = usePatientTrajectory(mockPatients[0].riskResult);

  return (
    <div className="patient-dashboard">
      <section className="patient-dashboard__intro">
        <h2 className="patient-dashboard__title">Your pregnancy health</h2>
        <p className="patient-dashboard__subtitle">
          {status === "loading" && "Loading your information…"}
          {status === "live" && "Showing your latest recorded information."}
          {status === "fallback" && "Showing example information (live service unavailable)."}
        </p>
      </section>

      <PatientRiskSummary riskResult={riskResult} />
      <PatientChat />
    </div>
  );
}
