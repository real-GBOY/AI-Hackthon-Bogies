import type { Patient } from "../../types";
import { deriveAlerts } from "../aggregate";
import { avatarStyle, badgeStyle, bandColor, bandLabel, dotStyle, initials } from "../theme";
import "./Views.css";

interface AlertsViewProps {
  patients: Patient[];
  onOpenPatient: (id: string) => void;
}

export function AlertsView({ patients, onOpenPatient }: AlertsViewProps) {
  const alerts = deriveAlerts(patients);

  return (
    <div className="hdp-page">
      <div className="hdp-page-head">
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <h1 className="hdp-h1">Alerts</h1>
          <div className="hdp-subtle">Threshold crossings, rising trajectories, and data gaps raised by the scorer.</div>
        </div>
      </div>

      <div className="hdp-table">
        <div className="hdp-table__head" style={{ gridTemplateColumns: "1.4fr 2.4fr 1fr 1fr" }}>
          <span>PATIENT</span>
          <span>ALERT</span>
          <span>BAND</span>
          <span style={{ textAlign: "right" }}>ASSESSED</span>
        </div>
        {alerts.length === 0 && <div className="hdp-empty">No alerts raised — nothing is near a boundary or trending upward right now.</div>}
        {alerts.map((a) => (
          <div
            key={a.id}
            className="hdp-table__row hdp-table__row--click"
            style={{ gridTemplateColumns: "1.4fr 2.4fr 1fr 1fr" }}
            onClick={() => onOpenPatient(a.patientId)}
          >
            <div className="hdp-avatar-cell">
              <span style={avatarStyle(a.category)}>{initials(a.patientName)}</span>
              <span style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
                <span className="name">{a.patientName}</span>
                <span className="mrn mono">{a.patientId}</span>
              </span>
            </div>
            <span style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
              <span style={dotStyle(bandColor(a.category))} />
              <span style={{ fontSize: 12.5, lineHeight: 1.45 }}>{a.text}</span>
            </span>
            <span>
              <span style={badgeStyle(a.category)}>{bandLabel(a.category)}</span>
            </span>
            <span className="mono" style={{ fontSize: 11.5, color: "#8a91a0", textAlign: "right" }}>
              {new Date(a.time).toLocaleDateString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
